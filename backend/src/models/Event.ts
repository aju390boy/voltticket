import mongoose, { Document, Schema } from 'mongoose';

export type EventStatus = 'upcoming' | 'live' | 'sold_out' | 'ended' | 'paused';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  artist: string;
  venue: string;
  venueCity: string;
  date: Date;
  saleStartTime: Date;
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  soldSeats: number;
  status: EventStatus;
  imageUrl: string;
  priceByTier: {
    GA: number;
    LOWER: number;
    UPPER: number;
    VIP: number;
    BACKSTAGE: number;
  };
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    venue: { type: String, required: true },
    venueCity: { type: String, required: true },
    date: { type: Date, required: true },
    saleStartTime: { type: Date, required: true },
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    lockedSeats: { type: Number, default: 0 },
    soldSeats: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'sold_out', 'ended', 'paused'],
      default: 'upcoming',
    },
    imageUrl: { type: String, default: '' },
    priceByTier: {
      GA: { type: Number, default: 50 },
      LOWER: { type: Number, default: 100 },
      UPPER: { type: Number, default: 75 },
      VIP: { type: Number, default: 250 },
      BACKSTAGE: { type: Number, default: 500 },
    },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

EventSchema.index({ status: 1 });
EventSchema.index({ saleStartTime: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
