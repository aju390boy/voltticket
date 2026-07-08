import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../config/bullmq';
import { EmailService } from '../services/EmailService';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Seat } from '../models/Seat';
import { logger } from '../utils/logger';

export function startEmailWorker() {
  const worker = new Worker(
    'email',
    async (job: Job) => {
      const { orderId, userId } = job.data;

      const [order, user] = await Promise.all([
        Order.findById(orderId).lean(),
        User.findById(userId).lean(),
      ]);

      if (!order || !user) throw new Error('Missing order/user data for email');

      const event = await Event.findById(order.eventId).lean();
      if (!event) throw new Error('Missing event data for email');

      const seats = await Seat.find({ _id: { $in: order.seatIds } }).lean();

      await EmailService.sendTicketEmail({
        to: user.email,
        name: user.name,
        eventTitle: event.title,
        artist: event.artist,
        venue: `${event.venue}, ${event.venueCity}`,
        date: new Date(event.date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        seats: seats.map((s) => ({ label: s.label, section: s.section, tier: s.tier })),
        orderId: order._id.toString(),
        totalAmount: order.totalAmount,
      });
    },
    { connection: bullmqConnection, concurrency: 20 }
  );

  worker.on('failed', (job, err) => logger.error(`Email job ${job?.id} failed:`, err.message));
  logger.info('✅ Email worker started');
  return worker;
}
