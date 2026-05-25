/**
 * Activity model for CRM activity logging
 * Tracks user actions and interactions
 */
import mongoose, { Document, Schema } from 'mongoose';

/**
 * Activity document interface
 * Extends Mongoose Document with typed fields
 */
export interface IActivity extends Document {
  type: string;
  content?: string;
  contact_id?: mongoose.Types.ObjectId;
  deal_id?: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

/**
 * Activity schema definition
 * Defines fields, validation, and timestamps
 */
const ActivitySchema = new Schema<IActivity>(
  {
    type: { type: String, required: true },
    content: { type: String },
    contact_id: { type: Schema.Types.ObjectId, ref: 'Contact' },
    deal_id: { type: Schema.Types.ObjectId, ref: 'Deal' },
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false }
  }
);

ActivitySchema.index({ organization_id: 1, created_at: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
