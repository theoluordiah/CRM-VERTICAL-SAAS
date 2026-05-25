import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailVerificationOtp extends Document {
  user_id: mongoose.Types.ObjectId;
  otp_hash: string;
  expires_at: Date;
  used_at?: Date | null;
  attempts: number;
  created_at: Date;
}

const EmailVerificationOtpSchema = new Schema<IEmailVerificationOtp>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    otp_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

EmailVerificationOtpSchema.index({ user_id: 1, created_at: -1 });

export const EmailVerificationOtp = mongoose.model<IEmailVerificationOtp>(
  'EmailVerificationOtp',
  EmailVerificationOtpSchema
);
