import { Response } from 'express';
import mongoose from 'mongoose';
import { Pipeline, IPipeline, PipelineStage, IPipelineStage } from '../models/Pipeline';
import { Deal } from '../models/Deal';
import { AuthRequest } from '../types';
import { requireOrganization } from '../utils/tenant';

export const listPipelines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const pipelines = await Pipeline.find({ organization_id: organizationId }).sort({ created_at: -1 }).lean();
    res.json({ status: true, message: 'Pipelines retrieved successfully', data: pipelines });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch pipelines'
    });
  }
};

export const getPipelineById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid pipeline ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const pipeline = await Pipeline.findOne({ _id: id, organization_id: organizationId }).lean();

    if (!pipeline) {
      res.status(404).json({
        status: false,
        message: 'Pipeline not found'
      });
      return;
    }

    res.json({ status: true, message: 'Pipeline retrieved successfully', data: pipeline });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch pipeline'
    });
  }
};

interface CreatePipelineBody {
  name: string;
  description?: string;
  is_default?: boolean;
}

export const createPipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, is_default } = req.body as CreatePipelineBody;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (is_default) {
      await Pipeline.updateMany({ organization_id: organizationId, is_default: true }, { $set: { is_default: false } });
    }

    const pipeline = new Pipeline({
      name,
      description,
      is_default: is_default || false,
      organization_id: organizationId
    });

    await pipeline.save();
    res.status(201).json({ status: true, message: 'Pipeline created successfully', data: pipeline });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to create pipeline'
    });
  }
};

interface UpdatePipelineBody {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export const updatePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, is_default } = req.body as UpdatePipelineBody;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid pipeline ID'
      });
      return;
    }

    const updateObj: Record<string, unknown> = {};
    if (name) updateObj.name = name;
    if (description !== undefined) updateObj.description = description;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (is_default) {
      await Pipeline.updateMany({ organization_id: organizationId, is_default: true }, { $set: { is_default: false } });
      updateObj.is_default = true;
    }

    const pipeline = await Pipeline.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { $set: updateObj },
      { new: true }
    );

    if (!pipeline) {
      res.status(404).json({
        status: false,
        message: 'Pipeline not found'
      });
      return;
    }

    res.json({ status: true, message: 'Pipeline updated successfully', data: pipeline });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update pipeline'
    });
  }
};

export const deletePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid pipeline ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const pipeline = await Pipeline.findOneAndDelete({ _id: id, organization_id: organizationId });

    if (!pipeline) {
      res.status(404).json({
        status: false,
        message: 'Pipeline not found'
      });
      return;
    }

    await PipelineStage.deleteMany({ pipeline_id: id, organization_id: organizationId });

    res.json({ status: true, message: 'Pipeline deleted successfully' });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to delete pipeline'
    });
  }
};

export const listPipelineStages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    let { pipeline_id } = req.query as { pipeline_id?: string };

    if (!pipeline_id) {
      const defaultPipeline = await Pipeline.findOne({ organization_id: organizationId, is_default: true });
      if (!defaultPipeline) {
        res.status(404).json({
          status: false,
          message: 'No pipeline found'
        });
        return;
      }
      pipeline_id = defaultPipeline._id.toString();
    }

    const stages = await PipelineStage.find({ pipeline_id, organization_id: organizationId })
      .sort({ order: 1 })
      .lean();

    res.json({ status: true, message: 'Pipeline stages retrieved successfully', data: stages });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch stages'
    });
  }
};

export const getStageById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid stage ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const stage = await PipelineStage.findOne({ _id: id, organization_id: organizationId }).lean();

    if (!stage) {
      res.status(404).json({
        status: false,
        message: 'Stage not found'
      });
      return;
    }

    res.json({ status: true, message: 'Stage retrieved successfully', data: stage });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch stage'
    });
  }
};

interface CreateStageBody {
  name: string;
  description?: string;
  pipeline_id: string;
  order?: number;
  is_won?: boolean;
  is_lost?: boolean;
  assignees?: string[];
}

export const createStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, pipeline_id, order, is_won, is_lost, assignees } = req.body as CreateStageBody;

    if (!mongoose.Types.ObjectId.isValid(pipeline_id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid pipeline ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const pipeline = await Pipeline.exists({ _id: pipeline_id, organization_id: organizationId });
    if (!pipeline) {
      res.status(404).json({ status: false, message: 'Pipeline not found' });
      return;
    }

    let stageOrder = order;
    if (stageOrder === undefined) {
      const maxStage = await PipelineStage.findOne({ pipeline_id, organization_id: organizationId })
        .sort({ order: -1 })
        .lean();
      stageOrder = (maxStage?.order || 0) + 1;
    }

    const stage = new PipelineStage({
      name,
      description,
      pipeline_id: new mongoose.Types.ObjectId(pipeline_id),
      order: stageOrder,
      is_won: is_won || false,
      is_lost: is_lost || false,
      organization_id: organizationId,
      assignees: assignees
        ? assignees.map((a: string) => new mongoose.Types.ObjectId(a))
        : []
    });

    await stage.save();
    res.status(201).json({ status: true, message: 'Stage created successfully', data: stage });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to create stage'
    });
  }
};

interface UpdateStageBody {
  name?: string;
  description?: string;
  order?: number;
  is_won?: boolean;
  is_lost?: boolean;
  assignees?: string[];
}

export const updateStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as UpdateStageBody;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid stage ID'
      });
      return;
    }

    const updateObj: Record<string, unknown> = { ...updateData };

    if (updateData.assignees) {
      updateObj.assignees = updateData.assignees.map(
        (a: string) => new mongoose.Types.ObjectId(a)
      );
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const stage = await PipelineStage.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { $set: updateObj },
      { new: true, runValidators: true }
    );

    if (!stage) {
      res.status(404).json({
        status: false,
        message: 'Stage not found'
      });
      return;
    }

    res.json({ status: true, message: 'Stage updated successfully', data: stage });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update stage'
    });
  }
};

export const deleteStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid stage ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const dealsInStage = await Deal.countDocuments({ stage_id: id, organization_id: organizationId });
    if (dealsInStage > 0) {
      res.status(400).json({
        status: false,
        message: 'Cannot delete stage with deals. Move or delete deals first.'
      });
      return;
    }

    const stage = await PipelineStage.findOneAndDelete({ _id: id, organization_id: organizationId });

    if (!stage) {
      res.status(404).json({
        status: false,
        message: 'Stage not found'
      });
      return;
    }

    res.json({ status: true, message: 'Stage deleted successfully' });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to delete stage'
    });
  }
};

export const getPipelineBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    let { pipeline_id } = req.query as { pipeline_id?: string };

    if (!pipeline_id) {
      const defaultPipeline = await Pipeline.findOne({ organization_id: organizationId, is_default: true });
      if (!defaultPipeline) {
        res.status(404).json({
          status: false,
          message: 'No pipeline found'
        });
        return;
      }
      pipeline_id = defaultPipeline._id.toString();
    }

    const stages = await PipelineStage.find({ pipeline_id, organization_id: organizationId })
      .populate('assignees', 'email display_name')
      .sort({ order: 1 })
      .lean();

    const stageIds = stages.map((s) => s._id);

    const deals = await Deal.find({ stage_id: { $in: stageIds }, organization_id: organizationId })
      .populate('company_id', 'name')
      .populate('contact_id', 'first_name last_name')
      .populate('owner_id', 'email display_name')
      .lean();

    const boardData = stages.map((stage) => {
      const stageDeals = deals.filter((deal) =>
        deal.stage_id?.toString() === stage._id.toString()
      );

      const totalValue = stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      const dealCount = stageDeals.length;

      return {
        stage: {
          id: stage._id,
          name: stage.name,
          order: stage.order,
          is_won: stage.is_won,
          is_lost: stage.is_lost,
          assignees: stage.assignees
        },
        deals: stageDeals,
        stats: {
          deal_count: dealCount,
          total_value: totalValue
        }
      };
    });

    res.json({ status: true, message: 'Pipeline board retrieved successfully', data: boardData });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch pipeline board'
    });
  }
};

export const reorderStages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const { stages } = req.body as { stages: { id: string; order: number }[] };

    if (!Array.isArray(stages) || stages.length === 0) {
      res.status(400).json({
        status: false,
        message: 'stages array is required'
      });
      return;
    }

    const bulkOps = stages.map((stage) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(stage.id), organization_id: organizationId },
        update: { $set: { order: stage.order } }
      }
    }));

    await PipelineStage.bulkWrite(bulkOps);

    res.json({ status: true, message: 'Stages reordered successfully' });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to reorder stages'
    });
  }
};
