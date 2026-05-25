import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export interface IUserInvitation extends Document {
  email: string;
  display_name?: string;
  role: UserRole;
  organization_id: mongoose.Types.ObjectId;
  invited_by: mongoose.Types.ObjectId;
  token_hash: string;
  expires_at: Date;
  accepted_at?: Date | null;
  revoked_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

const UserInvitationSchema = new Schema<IUserInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    display_name: { type: String, trim: true },
    role: {
      type: String,
      enum: ['admin', 'sales_manager', 'sales_rep', 'viewer'],
      default: 'viewer'
    },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    invited_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    accepted_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

UserInvitationSchema.index({ organization_id: 1, email: 1 });
UserInvitationSchema.index({ token_hash: 1 }, { unique: true });
UserInvitationSchema.index({ expires_at: 1 });

export const UserInvitation = mongoose.model<IUserInvitation>('UserInvitation', UserInvitationSchema);
