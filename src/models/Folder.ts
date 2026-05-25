import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  owner_id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true, trim: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

FolderSchema.index({ organization_id: 1, parent_id: 1 });
FolderSchema.index({ organization_id: 1, owner_id: 1 });

export const Folder = mongoose.model<IFolder>('Folder', FolderSchema);
