import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  entityType: 'seat' | 'order' | 'event';
  entityId: mongoose.Types.ObjectId;
  action: string;
  userId?: mongoose.Types.ObjectId;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entityType: { type: String, enum: ['seat', 'order', 'event'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

AuditLogSchema.index({ entityId: 1, entityType: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
