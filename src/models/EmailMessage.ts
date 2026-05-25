import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailMessage extends Document {
  user_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  gmail_message_id: string;
  thread_id: string;
  from_name: string;
  from_email: string;
  to: string[];
  subject: string;
  snippet: string;
  received_at: Date;
  is_read: boolean;
  contact_id?: mongoose.Types.ObjectId;
  created_at: Date;
}

const EmailMessageSchema = new Schema<IEmailMessage>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    gmail_message_id: { type: String, required: true },
    thread_id: { type: String, required: true },
    from_name: { type: String, default: '' },
    from_email: { type: String, required: true },
    to: [{ type: String }],
    subject: { type: String, default: '' },
    snippet: { type: String, default: '' },
    received_at: { type: Date, required: true },
    is_read: { type: Boolean, default: false },
    contact_id: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

EmailMessageSchema.index({ organization_id: 1, user_id: 1, received_at: -1 });
EmailMessageSchema.index({ organization_id: 1, user_id: 1, gmail_message_id: 1 }, { unique: true });
EmailMessageSchema.index({ organization_id: 1, from_email: 1 });

export const EmailMessage = mongoose.model<IEmailMessage>('EmailMessage', EmailMessageSchema);
