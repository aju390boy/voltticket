import mongoose, { Document, Schema } from 'mongoose';

export type SeatStatus = 'available' | 'locked' | 'sold' | 'disabled';
export type SeatTier = 'GA' | 'LOWER' | 'UPPER' | 'VIP' | 'BACKSTAGE';

export interface ISeat extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  label: string;
  section: string;
  row: string;
  column: number;
  tier: SeatTier;
  price: number;
  status: SeatStatus;
  lockedBy?: mongoose.Types.ObjectId;
  lockedUntil?: Date;
  orderId?: mongoose.Types.ObjectId;
  fencingToken: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema = new Schema<ISeat>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    label: { type: String, required: true },
    section: { type: String, required: true },
    row: { type: String, required: true },
    column: { type: Number, required: true },
    tier: {
      type: String,
      enum: ['GA', 'LOWER', 'UPPER', 'VIP', 'BACKSTAGE'],
      required: true,
    },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'locked', 'sold', 'disabled'],
      default: 'available',
    },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedUntil: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    fencingToken: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SeatSchema.index({ eventId: 1, status: 1 });
SeatSchema.index({ eventId: 1, label: 1 }, { unique: true });
SeatSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 0 });

export const Seat = mongoose.model<ISeat>('Seat', SeatSchema);
