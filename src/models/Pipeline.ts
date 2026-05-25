import mongoose, { Document, Schema } from 'mongoose';

export interface IPipelineStage extends Document {
  name: string;
  description?: string;
  pipeline_id: mongoose.Types.ObjectId;
  order: number;
  is_won: boolean;
  is_lost: boolean;
  assignees: mongoose.Types.ObjectId[];
  organization_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>(
  {
    name: { type: String, required: true },
    description: { type: String },
    pipeline_id: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true },
    order: { type: Number, required: true },
    is_won: { type: Boolean, default: false },
    is_lost: { type: Boolean, default: false },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

PipelineStageSchema.index({ organization_id: 1, pipeline_id: 1, order: 1 });

export const PipelineStage = mongoose.model<IPipelineStage>('PipelineStage', PipelineStageSchema);

export interface IPipeline extends Document {
  name: string;
  description?: string;
  is_default: boolean;
  organization_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PipelineSchema = new Schema<IPipeline>(
  {
    name: { type: String, required: true },
    description: { type: String },
    is_default: { type: Boolean, default: false },
    organization_id: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

PipelineSchema.index({ organization_id: 1, is_default: 1 });

export const Pipeline = mongoose.model<IPipeline>('Pipeline', PipelineSchema);
