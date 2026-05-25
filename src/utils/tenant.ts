import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../types';

export const getOrganizationObjectId = (req: AuthRequest): mongoose.Types.ObjectId | null => {
  const organizationId = req.user?.organization_id;
  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) return null;

  return new mongoose.Types.ObjectId(organizationId);
};

export const requireOrganization = (req: AuthRequest, res: Response): mongoose.Types.ObjectId | null => {
  const organizationId = getOrganizationObjectId(req);
  if (!organizationId) {
    res.status(401).json({ status: false, message: 'Organization context required' });
    return null;
  }

  return organizationId;
};

export const tenantQuery = (req: AuthRequest, res: Response): Record<string, mongoose.Types.ObjectId> | null => {
  const organizationId = requireOrganization(req, res);
  return organizationId ? { organization_id: organizationId } : null;
};
