/**
 * Task model for CRM tasks/activities
 * Represents tasks, meetings, calls, and follow-ups
 */
import mongoose, { Document, Schema } from 'mongoose';

/** Type of task */
export type TaskType = 'task' | 'meeting' | 'call' | 'follow_up';
/** Priority level of task */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
/** Status of task */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Task document interface
 * Extends Mongoose Document with typed fields
 */
export interface ITask extends Document {
  title: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  description?: string;
  due_at?: Date;
  duration_minutes?: number;
  location?: string;
  meeting_url?: string;
  contact_id?: mongoose.Types.ObjectId;
  deal_id?: mongoose.Types.ObjectId;
  company_id?: mongoose.Types.ObjectId;
  owner_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[];
  reminder_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Task schema definition
 * Defines fields, validation, and timestamps
 */
const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['task', 'meeting', 'call', 'follow_up'],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    description: { type: String },
    due_at: { type: Date },
    duration_minutes: { type: Number },
    location: { type: String },
    meeting_url: { type: String },
    contact_id: { type: Schema.Types.ObjectId, ref: 'Contact' },
    deal_id: { type: Schema.Types.ObjectId, ref: 'Deal' },
    company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reminder_sent_at: { type: Date }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

TaskSchema.index({ organization_id: 1, due_at: 1, status: 1, reminder_sent_at: 1 });
TaskSchema.index({ organization_id: 1, owner_id: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
