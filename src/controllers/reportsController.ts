import { Response } from 'express';
import mongoose from 'mongoose';
import { Contact } from '../models/Contact';
import { Deal } from '../models/Deal';
import { PipelineStage } from '../models/Pipeline';
import { AuthRequest } from '../types';
import { requireOrganization } from '../utils/tenant';

type StageMapValue = {
  name: string;
  is_won: boolean;
  is_lost: boolean;
};

const getStageMap = async (organizationId: mongoose.Types.ObjectId) => {
  const stages = await PipelineStage.find({ organization_id: organizationId })
    .select('_id name is_won is_lost order')
    .sort({ order: 1 })
    .lean();

  return new Map<string, StageMapValue>(
    stages.map((stage) => [
      String(stage._id),
      {
        name: stage.name,
        is_won: stage.is_won,
        is_lost: stage.is_lost
      }
    ])
  );
};

const getSummary = async (organizationId: mongoose.Types.ObjectId) => {
  const [stageMap, deals] = await Promise.all([
    getStageMap(organizationId),
    Deal.find({ organization_id: organizationId }).select('value stage_id').lean()
  ]);

  let openValue = 0;
  let wonValue = 0;
  let lostValue = 0;

  for (const deal of deals) {
    const stage = deal.stage_id ? stageMap.get(String(deal.stage_id)) : undefined;
    const value = deal.value || 0;

    if (stage?.is_won) {
      wonValue += value;
    } else if (stage?.is_lost) {
      lostValue += value;
    } else {
      openValue += value;
    }
  }

  return {
    total_deals: deals.length,
    open_value: openValue,
    won_value: wonValue,
    lost_value: lostValue
  };
};

const getPipelineByStage = async (organizationId: mongoose.Types.ObjectId) => {
  const rows = await Deal.aggregate([
    { $match: { organization_id: organizationId } },
    { $group: { _id: '$stage_id', count: { $sum: 1 }, value: { $sum: { $ifNull: ['$value', 0] } } } },
    { $lookup: { from: 'pipelinestages', localField: '_id', foreignField: '_id', as: 'stage' } },
    { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: { $ifNull: ['$stage.name', 'Unassigned'] },
        count: 1,
        value: 1,
        order: { $ifNull: ['$stage.order', 9999] },
        _id: 0
      }
    },
    { $sort: { order: 1, name: 1 } }
  ]);

  return rows.map(({ order, ...row }) => row);
};

const getDealSourceMix = async (organizationId: mongoose.Types.ObjectId) =>
  Deal.aggregate([
    { $match: { organization_id: organizationId } },
    {
      $group: {
        _id: {
          $cond: [
            { $or: [{ $eq: ['$source', null] }, { $eq: ['$source', ''] }] },
            'Direct',
            '$source'
          ]
        },
        value: { $sum: 1 }
      }
    },
    { $project: { name: '$_id', value: 1, _id: 0 } },
    { $sort: { value: -1, name: 1 } }
  ]);

const getContactTemperature = async (organizationId: mongoose.Types.ObjectId) =>
  Contact.aggregate([
    { $match: { organization_id: organizationId } },
    {
      $group: {
        _id: {
          $cond: [
            { $or: [{ $eq: ['$temperature', null] }, { $eq: ['$temperature', ''] }] },
            'warm',
            '$temperature'
          ]
        },
        value: { $sum: 1 }
      }
    },
    {
      $project: {
        name: {
          $concat: [
            { $toUpper: { $substrCP: ['$_id', 0, 1] } },
            { $substrCP: ['$_id', 1, { $strLenCP: '$_id' }] }
          ]
        },
        value: 1,
        _id: 0
      }
    },
    { $sort: { name: 1 } }
  ]);

const escapeCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const sendCsv = (res: Response, filename: string, headers: string[], rows: unknown[][]) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send([headers.join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n'));
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const [summary, pipelineByStage, dealSourceMix, contactTemperature] = await Promise.all([
      getSummary(organizationId),
      getPipelineByStage(organizationId),
      getDealSourceMix(organizationId),
      getContactTemperature(organizationId)
    ]);

    res.json({
      summary,
      pipeline_by_stage: pipelineByStage,
      deal_source_mix: dealSourceMix,
      contact_temperature: contactTemperature
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

export const getReportsSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    res.json(await getSummary(organizationId));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reports summary' });
  }
};

export const getReportsPipelineByStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    res.json(await getPipelineByStage(organizationId));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pipeline report' });
  }
};

export const getReportsDealSourceMix = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    res.json(await getDealSourceMix(organizationId));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deal source mix' });
  }
};

export const getReportsContactTemperature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;
    res.json(await getContactTemperature(organizationId));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contact temperature' });
  }
};

export const exportReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const type = String(req.query.type || 'summary');

    if (type === 'pipeline-by-stage') {
      const rows = await getPipelineByStage(organizationId);
      sendCsv(res, 'pipeline-by-stage.csv', ['name', 'count', 'value'], rows.map((row) => [row.name, row.count, row.value]));
      return;
    }

    if (type === 'deal-source-mix') {
      const rows = await getDealSourceMix(organizationId);
      sendCsv(res, 'deal-source-mix.csv', ['name', 'value'], rows.map((row) => [row.name, row.value]));
      return;
    }

    if (type === 'contact-temperature') {
      const rows = await getContactTemperature(organizationId);
      sendCsv(res, 'contact-temperature.csv', ['name', 'value'], rows.map((row) => [row.name, row.value]));
      return;
    }

    const summary = await getSummary(organizationId);
    sendCsv(res, 'summary.csv', ['total_deals', 'open_value', 'won_value', 'lost_value'], [[
      summary.total_deals,
      summary.open_value,
      summary.won_value,
      summary.lost_value
    ]]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export report' });
  }
};
