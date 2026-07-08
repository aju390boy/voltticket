import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded';

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  seatIds: mongoose.Types.ObjectId[];
  status: OrderStatus;
  stripePaymentIntentId?: string;
  idempotencyKey: string;
  totalAmount: number;
  ticketQrCode?: string;
  jobId?: string;
  refundId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    seatIds: [{ type: Schema.Types.ObjectId, ref: 'Seat' }],
    status: {
      type: String,
      enum: ['pending', 'processing', 'confirmed', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String },
    idempotencyKey: { type: String, required: true, unique: true },
    totalAmount: { type: Number, required: true },
    ticketQrCode: { type: String },
    jobId: { type: String },
    refundId: { type: String },
  },
  { timestamps: true, optimisticConcurrency: true }
);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ eventId: 1, status: 1 });
OrderSchema.index({ stripePaymentIntentId: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
