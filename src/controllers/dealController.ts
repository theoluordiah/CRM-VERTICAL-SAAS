import { Response } from 'express';
import mongoose from 'mongoose';
import { Deal, IDeal, DealStatus } from '../models/Deal';
import { Company } from '../models/Company';
import { Activity } from '../models/Activity';
import { AuthRequest, PaginatedResponse } from '../types';
import { requireOrganization } from '../utils/tenant';

interface DealQuery {
  page?: number;
  limit?: number;
  search?: string;
  company_id?: string;
  owner_id?: string;
  stage_id?: string;
  status?: DealStatus;
}

export const listDeals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      company_id,
      owner_id,
      stage_id,
      status
    } = req.query as DealQuery;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query: Record<string, unknown> = { organization_id: organizationId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ];
    }

    if (company_id) query.company_id = new mongoose.Types.ObjectId(company_id);
    if (owner_id) query.owner_id = new mongoose.Types.ObjectId(owner_id);
    if (stage_id) query.stage_id = new mongoose.Types.ObjectId(stage_id);
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('stage_id', 'name order is_won is_lost')
        .populate('company_id', 'name industry website')
        .populate('contact_id', 'first_name last_name email')
        .populate('owner_id', 'email display_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Deal.countDocuments(query)
    ]);

    const response: PaginatedResponse<IDeal> = {
      status: true,
      message: 'Deals retrieved successfully',
      data: deals,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch deals'
    });
  }
};

export const getDealById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = await Deal.findOne({ _id: id, organization_id: organizationId })
      .populate('stage_id', 'name order is_won is_lost')
      .populate('company_id', 'name industry website')
      .populate('contact_id', 'first_name last_name email phone')
      .populate('owner_id', 'email display_name')
      .lean();

    if (!deal) {
      res.status(404).json({
        status: false,
        message: 'Deal not found'
      });
      return;
    }

    res.json({ status: true, message: 'Deal retrieved successfully', data: deal });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch deal'
    });
  }
};

interface CreateDealBody {
  title: string;
  value?: number;
  currency?: string;
  expected_close_date?: string;
  stage_id?: string;
  source?: string;
  industry?: string;
  company_id?: string;
  contact_id?: string;
}

export const createDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      value,
      currency,
      expected_close_date,
      stage_id,
      source,
      industry,
      company_id,
      contact_id
    } = req.body as CreateDealBody;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = new Deal({
      title,
      value,
      currency,
      expected_close_date: expected_close_date ? new Date(expected_close_date) : undefined,
      stage_id: stage_id ? new mongoose.Types.ObjectId(stage_id) : undefined,
      source,
      industry,
      company_id: company_id ? new mongoose.Types.ObjectId(company_id) : undefined,
      contact_id: contact_id ? new mongoose.Types.ObjectId(contact_id) : undefined,
      owner_id: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      organization_id: organizationId
    });

    await deal.save();

    const populatedDeal = await Deal.findOne({ _id: deal._id, organization_id: organizationId })
      .populate('stage_id', 'name order is_won is_lost')
      .populate('company_id', 'name industry website')
      .populate('contact_id', 'first_name last_name')
      .populate('owner_id', 'email display_name');

    if (req.user?.id) {
      await Activity.create({
        type: 'deal_created',
        content: `Deal "${title}" created`,
        deal_id: deal._id,
        user_id: new mongoose.Types.ObjectId(req.user.id),
        organization_id: organizationId
      });
    }

    res.status(201).json({ status: true, message: 'Deal created successfully', data: populatedDeal });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to create deal'
    });
  }
};

interface UpdateDealBody {
  title?: string;
  value?: number;
  currency?: string;
  status?: DealStatus;
  expected_close_date?: string;
  stage_id?: string;
  source?: string;
  industry?: string;
  company_id?: string | null;
  contact_id?: string | null;
}

export const updateDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as UpdateDealBody;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const updateObj: Record<string, unknown> = { ...updateData };

    if (updateData.expected_close_date) {
      updateObj.expected_close_date = new Date(updateData.expected_close_date);
    }

    if (updateData.stage_id) {
      updateObj.stage_id = new mongoose.Types.ObjectId(updateData.stage_id);
    } else if (updateData.stage_id === null) {
      updateObj.stage_id = null;
    }

    if (updateData.company_id) {
      updateObj.company_id = new mongoose.Types.ObjectId(updateData.company_id);
    } else if (updateData.company_id === null) {
      updateObj.company_id = null;
    }

    if (updateData.contact_id) {
      updateObj.contact_id = new mongoose.Types.ObjectId(updateData.contact_id);
    } else if (updateData.contact_id === null) {
      updateObj.contact_id = null;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = await Deal.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { $set: updateObj },
      { new: true, runValidators: true }
    )
      .populate('stage_id', 'name order is_won is_lost')
      .populate('company_id', 'name industry website')
      .populate('contact_id', 'first_name last_name')
      .populate('owner_id', 'email display_name');

    if (!deal) {
      res.status(404).json({
        status: false,
        message: 'Deal not found'
      });
      return;
    }

    if (req.user?.id && updateData.status) {
      await Activity.create({
        type: `deal_${updateData.status}`,
        content: `Deal status changed to ${updateData.status}`,
        deal_id: deal._id,
        user_id: new mongoose.Types.ObjectId(req.user.id),
        organization_id: organizationId
      });
    }

    res.json({ status: true, message: 'Deal updated successfully', data: deal });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update deal'
    });
  }
};

export const deleteDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = await Deal.findOneAndDelete({ _id: id, organization_id: organizationId });

    if (!deal) {
      res.status(404).json({
        status: false,
        message: 'Deal not found'
      });
      return;
    }

    res.json({ status: true, message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to delete deal'
    });
  }
};

export const getDealActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const activities = await Activity.find({ deal_id: id, organization_id: organizationId })
      .populate('user_id', 'email display_name')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    res.json({ status: true, message: 'Deal activities retrieved successfully', data: activities });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch activities'
    });
  }
};

export const getDealTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const { Task } = await import('../models/Task');
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const tasks = await Task.find({ deal_id: id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .populate('assignees', 'email display_name')
      .populate('contact_id', 'first_name last_name')
      .sort({ due_at: 1 })
      .lean();

    res.json({ status: true, message: 'Deal tasks retrieved successfully', data: tasks });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch tasks'
    });
  }
};

export const getDealStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = await Deal.findOne({ _id: id, organization_id: organizationId }).lean();
    if (!deal) {
      res.status(404).json({
        status: false,
        message: 'Deal not found'
      });
      return;
    }

    const { Task } = await import('../models/Task');
    const [taskCount, openTasks, activityCount] = await Promise.all([
      Task.countDocuments({ deal_id: id, organization_id: organizationId }),
      Task.countDocuments({ deal_id: id, organization_id: organizationId, status: { $ne: 'completed' } }),
      Activity.countDocuments({ deal_id: id, organization_id: organizationId })
    ]);

    res.json({
      status: true,
      message: 'Deal stats retrieved successfully',
      data: {
        value: deal.value || 0,
        currency: deal.currency || 'USD',
        status: deal.status,
        task_count: taskCount,
        open_tasks: openTasks,
        activity_count: activityCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch deal stats'
    });
  }
};

export const updateDealStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { stage_id, position } = req.body as { stage_id: string; position?: number };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid deal ID'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(stage_id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid stage ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deal = await Deal.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { $set: { stage_id: new mongoose.Types.ObjectId(stage_id) } },
      { new: true }
    )
      .populate('stage_id', 'name order is_won is_lost')
      .populate('company_id', 'name')
      .populate('contact_id', 'first_name last_name');

    if (!deal) {
      res.status(404).json({
        status: false,
        message: 'Deal not found'
      });
      return;
    }

    if (req.user?.id) {
      const { PipelineStage } = await import('../models/Pipeline');
      const stage = await PipelineStage.findOne({ _id: stage_id, organization_id: organizationId });
      await Activity.create({
        type: 'deal_stage_changed',
        content: `Deal moved to "${stage?.name}"`,
        deal_id: deal._id,
        user_id: new mongoose.Types.ObjectId(req.user.id),
        organization_id: organizationId
      });
    }

    res.json({ status: true, message: 'Deal stage updated successfully', data: deal });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update deal stage'
    });
  }
};

interface BulkUpdateStageBody {
  deal_ids: string[];
  stage_id: string;
}

export const bulkUpdateStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deal_ids, stage_id } = req.body as BulkUpdateStageBody;

    if (!Array.isArray(deal_ids) || deal_ids.length === 0) {
      res.status(400).json({
        status: false,
        message: 'deal_ids array is required'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(stage_id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid stage ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const result = await Deal.updateMany(
      { _id: { $in: deal_ids.map(id => new mongoose.Types.ObjectId(id)) }, organization_id: organizationId },
      { $set: { stage_id: new mongoose.Types.ObjectId(stage_id) } }
    );

    res.json({
      status: true,
      message: 'Deals stage updated successfully',
      data: { modified: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update deals'
    });
  }
};
