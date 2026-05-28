import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  description?: string;
  parent_id?: mongoose.Types.ObjectId;
  owner_id: mongoose.Types.ObjectId;
  last_modified_by?: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parent_id: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    last_modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

FolderSchema.index({ organization_id: 1, parent_id: 1 });
FolderSchema.index({ organization_id: 1, owner_id: 1 });
FolderSchema.index({ organization_id: 1, last_modified_by: 1 });

export const Folder = mongoose.model<IFolder>('Folder', FolderSchema);
