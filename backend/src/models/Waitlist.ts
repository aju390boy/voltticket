import mongoose, { Document, Schema } from 'mongoose';

export interface IWaitlist extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  tier?: string;
  notified: boolean;
  createdAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    tier: { type: String },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

WaitlistSchema.index({ eventId: 1, userId: 1 }, { unique: true });
WaitlistSchema.index({ eventId: 1, notified: 1 });

export const Waitlist = mongoose.model<IWaitlist>('Waitlist', WaitlistSchema);
