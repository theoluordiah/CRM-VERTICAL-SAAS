import mongoose, { Document, Schema } from 'mongoose';

export interface ICRMFile extends Document {
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  cloudinary_url: string;
  cloudinary_public_id: string;
  folder_id?: mongoose.Types.ObjectId;
  contact_id?: mongoose.Types.ObjectId;
  deal_id?: mongoose.Types.ObjectId;
  company_id?: mongoose.Types.ObjectId;
  owner_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  tags: string[];
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const CRMFileSchema = new Schema<ICRMFile>(
  {
    original_name: { type: String, required: true },
    stored_name: { type: String, required: true },
    mime_type: { type: String, required: true },
    file_size: { type: Number, required: true },
    cloudinary_url: { type: String, required: true },
    cloudinary_public_id: { type: String, required: true },
    folder_id: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    contact_id: { type: Schema.Types.ObjectId, ref: 'Contact' },
    deal_id: { type: Schema.Types.ObjectId, ref: 'Deal' },
    company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    tags: [{ type: String }],
    notes: { type: String }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

CRMFileSchema.index({ organization_id: 1, contact_id: 1 });
CRMFileSchema.index({ organization_id: 1, deal_id: 1 });
CRMFileSchema.index({ organization_id: 1, company_id: 1 });
CRMFileSchema.index({ organization_id: 1, owner_id: 1 });
CRMFileSchema.index({ organization_id: 1, folder_id: 1 });

export const CRMFile = mongoose.model<ICRMFile>('CRMFile', CRMFileSchema);
