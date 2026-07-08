import { Response } from 'express';
import { Event } from '../models/Event';
import { Seat } from '../models/Seat';
import { InventoryService } from '../services/InventoryService';
import { redis } from '../config/redis';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const EventController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
      const filter: Record<string, any> = {};
      if (status) filter.status = status;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [events, total] = await Promise.all([
        Event.find(filter).sort({ date: 1 }).skip(skip).limit(limitNum).lean(),
        Event.countDocuments(filter),
      ]);

      res.json({
        events,
        meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      logger.error('Event list error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to list events' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await Event.findById(req.params.id).lean();
      if (!event) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
        return;
      }

      // Attach live Redis inventory count
      const liveAvailable = await InventoryService.getCount(req.params.id as string);

      res.json({ event: { ...event, liveAvailable } });
    } catch (err) {
      logger.error('Event getById error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get event' });
    }
  },

  async getSeatMap(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: eventId } = req.params;

      // Try cache first
      const cached = await redis.get(`seatmap:${eventId}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      const seats = await Seat.find({ eventId })
        .select('label section row column tier price status lockedUntil')
        .lean();

      const seatMap = {
        eventId,
        seats,
        generatedAt: new Date().toISOString(),
      };

      // Cache for 10 seconds (seats change fast during flash sales)
      await redis.setex(`seatmap:${eventId}`, 10, JSON.stringify(seatMap));

      res.json(seatMap);
    } catch (err) {
      logger.error('Seat map error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get seat map' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        title, artist, venue, venueCity, date, saleStartTime,
        totalSeats, priceByTier, description, imageUrl,
      } = req.body;

      if (!title || !artist || !venue || !venueCity || !date || !saleStartTime || !totalSeats) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing required fields' });
        return;
      }

      const event = await Event.create({
        title, artist, venue, venueCity,
        date: new Date(date),
        saleStartTime: new Date(saleStartTime),
        totalSeats,
        availableSeats: totalSeats,
        priceByTier,
        description: description || '',
        imageUrl: imageUrl || '',
        status: 'upcoming',
      });

      // Initialize Redis inventory
      await InventoryService.initializeInventory(event._id.toString(), totalSeats);

      // Auto-generate seats
      await generateSeats(event._id.toString(), totalSeats, priceByTier || {});

      logger.info(`Event created: ${event._id} — ${title}`);
      res.status(201).json(event);
    } catch (err) {
      logger.error('Event create error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create event' });
    }
  },

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const validStatuses = ['upcoming', 'live', 'sold_out', 'ended', 'paused'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'INVALID_STATUS', message: 'Invalid status value' });
        return;
      }

      const event = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { returnDocument: 'after' }
      );

      if (!event) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
        return;
      }

      // If going live, ensure inventory is synced
      if (status === 'live') {
        await InventoryService.syncFromDatabase(req.params.id as string);
      }

      res.json(event);
    } catch (err) {
      logger.error('Update status error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update status' });
    }
  },
};

// Helper: generate seats for a new event
async function generateSeats(
  eventId: string,
  totalSeats: number,
  priceByTier: Record<string, number>
): Promise<void> {
  const tierConfig = [
    { tier: 'GA', section: 'GA', ratio: 0.4 },
    { tier: 'LOWER', section: 'LOWER', ratio: 0.25 },
    { tier: 'UPPER', section: 'UPPER', ratio: 0.2 },
    { tier: 'VIP', section: 'VIP', ratio: 0.1 },
    { tier: 'BACKSTAGE', section: 'BACKSTAGE', ratio: 0.05 },
  ] as const;

  const defaultPrices: Record<string, number> = {
    GA: 50, LOWER: 100, UPPER: 75, VIP: 250, BACKSTAGE: 500,
  };

  const seats = [];
  let seatCount = 0;

  for (const { tier, section, ratio } of tierConfig) {
    const count = Math.floor(totalSeats * ratio);
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = Math.ceil(count / rows.length);

    for (let r = 0; r < rows.length && seatCount < count; r++) {
      for (let c = 1; c <= seatsPerRow && seatCount < count; c++) {
        const label = `${section}-${rows[r]}${c}`;
        seats.push({
          eventId,
          label,
          section,
          row: rows[r],
          column: c,
          tier,
          price: priceByTier[tier] ?? defaultPrices[tier],
          status: 'available' as const,
          fencingToken: 0,
        });
        seatCount++;
      }
    }
  }

  if (seats.length > 0) {
    await Seat.insertMany(seats, { ordered: false });
    logger.info(`Generated ${seats.length} seats for event ${eventId}`);
  }
}

// ── Admin CRUD ────────────────────────────────────────────────
export const EventAdminController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        title, artist, venue, venueCity, date, saleStartTime,
        totalSeats, priceByTier, description, imageUrl, status,
      } = req.body;

      const event = await Event.create({
        title, artist, venue, venueCity,
        date: new Date(date),
        saleStartTime: new Date(saleStartTime),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats),
        lockedSeats: 0,
        soldSeats: 0,
        status: status || 'upcoming',
        imageUrl: imageUrl || '',
        description: description || '',
        priceByTier: priceByTier || { GA: 50, LOWER: 100, UPPER: 80, VIP: 250, BACKSTAGE: 500 },
      });

      // Auto-generate seats
      await generateSeats(String(event._id), Number(totalSeats), priceByTier || { GA: 50, LOWER: 100, UPPER: 80, VIP: 250, BACKSTAGE: 500 });

      logger.info(`Admin created event: ${event.title}`);
      res.status(201).json({ event });
    } catch (err: any) {
      logger.error('Create event error:', err);
      res.status(500).json({ error: 'CREATE_FAILED', message: err.message });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updateData: Record<string, any> = {};
      const allowed = ['title', 'artist', 'venue', 'venueCity', 'date', 'saleStartTime',
        'status', 'imageUrl', 'description', 'priceByTier'];
      allowed.forEach((key) => {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      });
      if (updateData.date) updateData.date = new Date(updateData.date);
      if (updateData.saleStartTime) updateData.saleStartTime = new Date(updateData.saleStartTime);

      const event = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { returnDocument: 'after' }
      );
      if (!event) { res.status(404).json({ error: 'NOT_FOUND' }); return; }

      logger.info(`Admin updated event: ${event.title}`);
      res.json({ event });
    } catch (err: any) {
      logger.error('Update event error:', err);
      res.status(500).json({ error: 'UPDATE_FAILED', message: err.message });
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await Event.findByIdAndDelete(req.params.id);
      if (!event) { res.status(404).json({ error: 'NOT_FOUND' }); return; }

      // Remove all seats for this event
      await Seat.deleteMany({ eventId: req.params.id });

      logger.info(`Admin deleted event: ${event.title}`);
      res.json({ message: 'Event deleted successfully' });
    } catch (err: any) {
      logger.error('Delete event error:', err);
      res.status(500).json({ error: 'DELETE_FAILED', message: err.message });
    }
  },
};
