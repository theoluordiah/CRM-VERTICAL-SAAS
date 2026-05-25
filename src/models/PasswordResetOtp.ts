import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordResetOtp extends Document {
  user_id: mongoose.Types.ObjectId;
  otp_hash: string;
  expires_at: Date;
  used_at?: Date;
  attempts: number;
  reset_token_hash?: string;
  reset_token_expires_at?: Date;
  created_at: Date;
}

const PasswordResetOtpSchema = new Schema<IPasswordResetOtp>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    otp_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    reset_token_hash: { type: String, default: null },
    reset_token_expires_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PasswordResetOtpSchema.index({ user_id: 1, created_at: -1 });
PasswordResetOtpSchema.index({ user_id: 1, reset_token_hash: 1 });

export const PasswordResetOtp = mongoose.model<IPasswordResetOtp>('PasswordResetOtp', PasswordResetOtpSchema);
