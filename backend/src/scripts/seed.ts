import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongoDB } from '../config/mongodb';
import { connectRedis } from '../config/redis';
import { Event } from '../models/Event';
import { Seat, SeatTier } from '../models/Seat';
import { User } from '../models/User';
import { InventoryService } from '../services/InventoryService';
import { logger } from '../utils/logger';

interface SectionConfig {
  section: string;
  tier: SeatTier;
  rows: string[];
  seatsPerRow: number;
  price: number;
}

const STADIUM_LAYOUT: SectionConfig[] = [
  { section: 'BACKSTAGE', tier: 'BACKSTAGE', rows: ['BS'], seatsPerRow: 20, price: 500 },
  { section: 'VIP-L', tier: 'VIP', rows: ['VA', 'VB', 'VC'], seatsPerRow: 15, price: 250 },
  { section: 'VIP-R', tier: 'VIP', rows: ['VA', 'VB', 'VC'], seatsPerRow: 15, price: 250 },
  { section: 'LOWER-C', tier: 'LOWER', rows: ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow: 25, price: 120 },
  { section: 'LOWER-L', tier: 'LOWER', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 20, price: 100 },
  { section: 'LOWER-R', tier: 'LOWER', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 20, price: 100 },
  { section: 'UPPER-L', tier: 'UPPER', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], seatsPerRow: 22, price: 75 },
  { section: 'UPPER-R', tier: 'UPPER', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], seatsPerRow: 22, price: 75 },
  { section: 'GA', tier: 'GA', rows: ['GA'], seatsPerRow: 200, price: 50 },
];

async function seed() {
  await connectRedis();
  await connectMongoDB();
  logger.info('🌱 Seeding VoltTicket database...');

  await Event.deleteMany({});
  await Seat.deleteMany({});
  await User.deleteMany({});

  // Create demo users
  await User.create({ name: 'Admin User', email: 'admin@volttticket.com', password: 'Admin123!', role: 'admin' });
  await User.create({ name: 'Test User', email: 'user@volttticket.com', password: 'User123!', role: 'user' });
  await User.create({ name: 'VIP Member', email: 'vip@volttticket.com', password: 'Vip123!', role: 'vip' });
  logger.info('✅ Demo users created');

  // Create event — status: live for immediate testing
  const event = await Event.create({
    title: 'The Resonance World Tour',
    artist: 'Aurora Blaze',
    venue: 'Volt Arena',
    venueCity: 'New York, NY',
    date: new Date('2026-09-15T19:00:00'),
    saleStartTime: new Date(Date.now() - 60_000), // Sale already started
    totalSeats: 1000,
    availableSeats: 1000,
    status: 'live',
    description: 'The most anticipated concert of 2026. Experience Aurora Blaze live for one unforgettable night at Volt Arena.',
    priceByTier: { GA: 50, LOWER: 100, UPPER: 75, VIP: 250, BACKSTAGE: 500 },
  });
  logger.info(`✅ Event created: ${event._id}`);

  // Generate 1000 seats
  const seats: any[] = [];
  let totalCount = 0;

  outer: for (const cfg of STADIUM_LAYOUT) {
    for (const row of cfg.rows) {
      for (let col = 1; col <= cfg.seatsPerRow; col++) {
        const label = `${cfg.section}-${row}${col}`;
        seats.push({
          eventId: event._id,
          label,
          section: cfg.section,
          row,
          column: col,
          tier: cfg.tier,
          price: cfg.price,
          status: 'available',
          fencingToken: 0,
        });
        totalCount++;
        if (totalCount >= 1000) break outer;
      }
    }
  }

  await Seat.insertMany(seats);
  await Event.findByIdAndUpdate(event._id, { totalSeats: seats.length, availableSeats: seats.length });
  await InventoryService.initializeInventory(event._id.toString(), seats.length);

  logger.info(`✅ ${seats.length} seats created and Redis inventory initialized`);
  logger.info('');
  logger.info('🎉 Seed complete!');
  logger.info(`   Event ID: ${event._id}`);
  logger.info('   Demo accounts:');
  logger.info('   admin@volttticket.com / Admin123!');
  logger.info('   user@volttticket.com / User123!');
  logger.info('   vip@volttticket.com / Vip123!');

  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
