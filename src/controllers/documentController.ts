import { Response } from 'express';
import mongoose from 'mongoose';
import { CRMFile, ICRMFile } from '../models/Document';
import { Folder } from '../models/Folder';
import { AuthRequest, PaginatedResponse } from '../types';
import cloudinary from '../config/cloudinary';
import { requireOrganization } from '../utils/tenant';

interface FileQuery {
  page?: number;
  limit?: number;
  search?: string;
  folder_id?: string;
  contact_id?: string;
  deal_id?: string;
  company_id?: string;
  owner_id?: string;
  tags?: string;
  mime_type?: string;
}

const getUserObjectId = (req: AuthRequest): mongoose.Types.ObjectId | undefined => (
  req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)
    ? new mongoose.Types.ObjectId(req.user.id)
    : undefined
);

const parsePagination = (page?: number | string, limit?: number | string) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
};

const parseFolderId = (folderId?: string | null) => {
  if (folderId === undefined) return undefined;
  if (folderId === null || folderId === '' || folderId === 'root' || folderId === 'null') return null;
  if (!mongoose.Types.ObjectId.isValid(folderId)) return false;

  return new mongoose.Types.ObjectId(folderId);
};

const ensureFolderExists = async (
  folderId: mongoose.Types.ObjectId | null | undefined,
  organizationId: mongoose.Types.ObjectId
) => {
  if (folderId === null || folderId === undefined) return true;

  return Boolean(await Folder.exists({ _id: folderId, organization_id: organizationId }));
};

const wouldCreateFolderCycle = async (
  folderId: string,
  nextParentId: mongoose.Types.ObjectId | null,
  organizationId: mongoose.Types.ObjectId
) => {
  if (!nextParentId) return false;

  let currentParentId: mongoose.Types.ObjectId | null = nextParentId;

  while (currentParentId) {
    if (currentParentId.toString() === folderId) return true;

    const parent: { parent_id?: mongoose.Types.ObjectId | string | null } | null = await Folder.findOne({
      _id: currentParentId,
      organization_id: organizationId
    })
      .select('parent_id')
      .lean();
    currentParentId = parent?.parent_id ? new mongoose.Types.ObjectId(parent.parent_id.toString()) : null;
  }

  return false;
};

export const listFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      folder_id,
      contact_id,
      deal_id,
      company_id,
      owner_id,
      tags,
      mime_type
    } = req.query as FileQuery;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query: Record<string, unknown> = { organization_id: organizationId };

    if (search) {
      query.$or = [
        { original_name: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (folder_id !== undefined) {
      const parsedFolderId = parseFolderId(folder_id);
      if (parsedFolderId === false) {
        res.status(400).json({ status: false, message: 'Invalid folder ID' });
        return;
      }
      query.folder_id = parsedFolderId;
    }
    if (contact_id) query.contact_id = new mongoose.Types.ObjectId(contact_id);
    if (deal_id) query.deal_id = new mongoose.Types.ObjectId(deal_id);
    if (company_id) query.company_id = new mongoose.Types.ObjectId(company_id);
    if (owner_id) query.owner_id = new mongoose.Types.ObjectId(owner_id);
    if (mime_type) query.mime_type = { $regex: `^${mime_type}`, $options: 'i' };
    if (tags) query.tags = { $in: String(tags).split(',') };

    const pagination = parsePagination(page, limit);

    const [files, total] = await Promise.all([
      CRMFile.find(query)
        .populate('owner_id', 'email display_name')
        .populate('contact_id', 'first_name last_name')
        .populate('deal_id', 'title')
        .populate('company_id', 'name')
        .populate('folder_id', 'name')
        .sort({ created_at: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      CRMFile.countDocuments(query)
    ]);

    const response: PaginatedResponse<ICRMFile> = {
      status: true,
      message: 'Files retrieved successfully',
      data: files as unknown as ICRMFile[],
      total,
      page: pagination.page,
      limit: pagination.limit,
      total_pages: Math.ceil(total / pagination.limit)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch files'
    });
  }
};

export const getFileById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid file ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const file = await CRMFile.findOne({ _id: id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .populate('contact_id', 'first_name last_name')
      .populate('deal_id', 'title')
      .populate('company_id', 'name')
      .populate('folder_id', 'name')
      .lean();

    if (!file) {
      res.status(404).json({ status: false, message: 'File not found' });
      return;
    }

    res.json({
      status: true,
      message: 'File retrieved successfully',
      data: file
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch file' });
  }
};

export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ status: false, message: 'No file provided' });
      return;
    }

    const { contact_id, deal_id, company_id, folder_id, tags, notes } = req.body as {
      contact_id?: string;
      deal_id?: string;
      company_id?: string;
      folder_id?: string;
      tags?: string;
      notes?: string;
    };

    const ownerId = getUserObjectId(req);
    if (!ownerId) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const parsedFolderId = parseFolderId(folder_id);
    if (parsedFolderId === false) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (!(await ensureFolderExists(parsedFolderId, organizationId))) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        resource_type: 'auto',
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        folder: 'crm'
      }
    );

    const file = new CRMFile({
      original_name: req.file.originalname,
      stored_name: result.public_id,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      cloudinary_url: result.secure_url,
      cloudinary_public_id: result.public_id,
      folder_id: parsedFolderId ?? null,
      contact_id: contact_id && mongoose.Types.ObjectId.isValid(contact_id)
        ? new mongoose.Types.ObjectId(contact_id)
        : undefined,
      deal_id: deal_id && mongoose.Types.ObjectId.isValid(deal_id)
        ? new mongoose.Types.ObjectId(deal_id)
        : undefined,
      company_id: company_id && mongoose.Types.ObjectId.isValid(company_id)
        ? new mongoose.Types.ObjectId(company_id)
        : undefined,
      owner_id: ownerId,
      organization_id: organizationId,
      tags: tags ? String(tags).split(',').map((t) => t.trim()) : [],
      notes
    });

    await file.save();

    const populated = await CRMFile.findOne({ _id: file._id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .populate('folder_id', 'name')
      .lean();

    res.status(201).json({
      status: true,
      message: 'File uploaded successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to upload file'
    });
  }
};

export const updateFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid file ID' });
      return;
    }

    const { original_name, folder_id, contact_id, deal_id, company_id, tags, notes } = req.body as {
      original_name?: string;
      folder_id?: string | null;
      contact_id?: string | null;
      deal_id?: string | null;
      company_id?: string | null;
      tags?: string[] | string;
      notes?: string | null;
    };

    const update: Record<string, unknown> = {};

    if (original_name !== undefined) {
      if (!original_name.trim()) {
        res.status(400).json({ status: false, message: 'File name is required' });
        return;
      }
      update.original_name = original_name.trim();
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (folder_id !== undefined) {
      const parsedFolderId = parseFolderId(folder_id);
      if (parsedFolderId === false) {
        res.status(400).json({ status: false, message: 'Invalid folder ID' });
        return;
      }
      if (!(await ensureFolderExists(parsedFolderId, organizationId))) {
        res.status(404).json({ status: false, message: 'Folder not found' });
        return;
      }
      update.folder_id = parsedFolderId;
    }

    const relationFields = { contact_id, deal_id, company_id };
    for (const [field, value] of Object.entries(relationFields)) {
      if (value === undefined) continue;
      if (value === null || value === '') {
        update[field] = null;
        continue;
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        res.status(400).json({ status: false, message: `Invalid ${field.replace('_', ' ')}` });
        return;
      }
      update[field] = new mongoose.Types.ObjectId(value);
    }

    if (tags !== undefined) {
      update.tags = Array.isArray(tags)
        ? tags.map((tag) => String(tag).trim()).filter(Boolean)
        : String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);
    }

    if (notes !== undefined) update.notes = notes;

    const file = await CRMFile.findOneAndUpdate({ _id: id, organization_id: organizationId }, update, { new: true })
      .populate('owner_id', 'email display_name')
      .populate('contact_id', 'first_name last_name')
      .populate('deal_id', 'title')
      .populate('company_id', 'name')
      .populate('folder_id', 'name parent_id')
      .lean();

    if (!file) {
      res.status(404).json({ status: false, message: 'File not found' });
      return;
    }

    res.json({
      status: true,
      message: 'File updated successfully',
      data: file
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to update file' });
  }
};

export const moveFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { folder_id } = req.body as { folder_id?: string | null };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid file ID' });
      return;
    }

    if (folder_id === undefined) {
      res.status(400).json({ status: false, message: 'folder_id is required. Use null or "root" for the root folder.' });
      return;
    }

    const parsedFolderId = parseFolderId(folder_id);
    if (parsedFolderId === false) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (!(await ensureFolderExists(parsedFolderId, organizationId))) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const file = await CRMFile.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { folder_id: parsedFolderId },
      { new: true }
    )
      .populate('owner_id', 'email display_name')
      .populate('folder_id', 'name parent_id')
      .lean();

    if (!file) {
      res.status(404).json({ status: false, message: 'File not found' });
      return;
    }

    res.json({
      status: true,
      message: 'File moved successfully',
      data: file
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to move file' });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid file ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const file = await CRMFile.findOne({ _id: id, organization_id: organizationId });

    if (!file) {
      res.status(404).json({ status: false, message: 'File not found' });
      return;
    }

    await cloudinary.uploader.destroy(file.cloudinary_public_id);

    await CRMFile.findOneAndDelete({ _id: id, organization_id: organizationId });

    res.json({ status: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to delete file' });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid file ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const file = await CRMFile.findOne({ _id: id, organization_id: organizationId }).lean();

    if (!file) {
      res.status(404).json({ status: false, message: 'File not found' });
      return;
    }

    res.redirect(file.cloudinary_url);
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to download file' });
  }
};

export const getFileStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const [totalFiles, totalSize, byType] = await Promise.all([
      CRMFile.countDocuments({ organization_id: organizationId }),
      CRMFile.aggregate([
        { $match: { organization_id: organizationId } },
        { $group: { _id: null, total: { $sum: '$file_size' } } }
      ]),
      CRMFile.aggregate([
        { $match: { organization_id: organizationId } },
        { $group: { _id: '$mime_type', count: { $sum: 1 }, totalSize: { $sum: '$file_size' } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      status: true,
      message: 'File stats retrieved successfully',
      data: {
        total_files: totalFiles,
        total_size_bytes: totalSize[0]?.total || 0,
        by_type: byType.map((t) => ({
          mime_type: t._id,
          count: t.count,
          total_size: t.totalSize
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch file stats' });
  }
};

export const createFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, parent_id } = req.body as { name?: string; parent_id?: string };

    if (!name || !name.trim()) {
      res.status(400).json({ status: false, message: 'Folder name is required' });
      return;
    }

    const ownerId = getUserObjectId(req);
    if (!ownerId) {
      res.status(401).json({ status: false, message: 'Unauthorized' });
      return;
    }

    const parsedParentId = parseFolderId(parent_id);
    if (parsedParentId === false) {
      res.status(400).json({ status: false, message: 'Invalid parent folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (!(await ensureFolderExists(parsedParentId, organizationId))) {
      res.status(404).json({ status: false, message: 'Parent folder not found' });
      return;
    }

    const folder = new Folder({
      name: name.trim(),
      parent_id: parsedParentId ?? null,
      owner_id: ownerId,
      organization_id: organizationId
    });

    await folder.save();

    res.status(201).json({
      status: true,
      message: 'Folder created successfully',
      data: folder
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to create folder' });
  }
};

export const listFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { parent_id } = req.query as { parent_id?: string };

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query: Record<string, unknown> = { organization_id: organizationId };
    const parsedParentId = parseFolderId(parent_id);
    if (parsedParentId === false) {
      res.status(400).json({ status: false, message: 'Invalid parent folder ID' });
      return;
    }
    query.parent_id = parsedParentId === undefined ? null : parsedParentId;

    const folders = await Folder.find(query)
      .populate('owner_id', 'email display_name')
      .sort({ name: 1 })
      .lean();

    res.json({
      status: true,
      message: 'Folders retrieved successfully',
      data: folders
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch folders' });
  }
};

export const getFolderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const folder = await Folder.findOne({ _id: id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .lean();

    if (!folder) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const [files, subfolders] = await Promise.all([
      CRMFile.countDocuments({ folder_id: id, organization_id: organizationId }),
      Folder.countDocuments({ parent_id: id, organization_id: organizationId })
    ]);

    res.json({
      status: true,
      message: 'Folder retrieved successfully',
      data: { ...folder, file_count: files, subfolder_count: subfolders }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch folder' });
  }
};

export const updateFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const { name, parent_id } = req.body as { name?: string; parent_id?: string };

    const update: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ status: false, message: 'Folder name is required' });
        return;
      }
      update.name = name.trim();
    }
    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (parent_id !== undefined) {
      const parsedParentId = parseFolderId(parent_id);
      if (parsedParentId === false) {
        res.status(400).json({ status: false, message: 'Invalid parent folder ID' });
        return;
      }
      if (!(await ensureFolderExists(parsedParentId, organizationId))) {
        res.status(404).json({ status: false, message: 'Parent folder not found' });
        return;
      }
      const nextParentId = parsedParentId ?? null;
      if (await wouldCreateFolderCycle(id, nextParentId, organizationId)) {
        res.status(400).json({ status: false, message: 'Cannot move a folder inside itself or one of its descendants' });
        return;
      }
      update.parent_id = nextParentId;
    }

    const folder = await Folder.findOneAndUpdate({ _id: id, organization_id: organizationId }, update, { new: true })
      .populate('owner_id', 'email display_name')
      .lean();

    if (!folder) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    res.json({
      status: true,
      message: 'Folder updated successfully',
      data: folder
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to update folder' });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const folder = await Folder.findOne({ _id: id, organization_id: organizationId });

    if (!folder) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const [fileCount, subfolderCount] = await Promise.all([
      CRMFile.countDocuments({ folder_id: id, organization_id: organizationId }),
      Folder.countDocuments({ parent_id: id, organization_id: organizationId })
    ]);

    if (fileCount > 0 || subfolderCount > 0) {
      res.status(400).json({
        status: false,
        message: `Folder is not empty (${fileCount} files, ${subfolderCount} subfolders). Move or delete them first.`
      });
      return;
    }

    await Folder.findOneAndDelete({ _id: id, organization_id: organizationId });

    res.json({ status: true, message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to delete folder' });
  }
};

export const getFolderFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params as { folderId: string };

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const folder = await Folder.findOne({ _id: folderId, organization_id: organizationId });
    if (!folder) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const {
      page = 1,
      limit = 20,
      search
    } = req.query as { page?: number; limit?: number; search?: string };

    const query: Record<string, unknown> = {
      folder_id: new mongoose.Types.ObjectId(folderId),
      organization_id: organizationId
    };

    if (search) {
      query.$or = [
        { original_name: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const pagination = parsePagination(page, limit);

    const [files, total] = await Promise.all([
      CRMFile.find(query)
        .populate('owner_id', 'email display_name')
        .sort({ created_at: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      CRMFile.countDocuments(query)
    ]);

    const response: PaginatedResponse<ICRMFile> = {
      status: true,
      message: 'Files retrieved successfully',
      data: files as unknown as ICRMFile[],
      total,
      page: pagination.page,
      limit: pagination.limit,
      total_pages: Math.ceil(total / pagination.limit)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to fetch folder files' });
  }
};

export const browseFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folder_id, search } = req.query as { folder_id?: string; search?: string };

    const parsedFolderId = parseFolderId(folder_id);
    if (parsedFolderId === false) {
      res.status(400).json({ status: false, message: 'Invalid folder ID' });
      return;
    }

    const currentFolderId = parsedFolderId === undefined ? null : parsedFolderId;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    if (!(await ensureFolderExists(currentFolderId, organizationId))) {
      res.status(404).json({ status: false, message: 'Folder not found' });
      return;
    }

    const baseNameQuery = search ? { name: { $regex: search, $options: 'i' } } : {};
    const fileSearchQuery = search
      ? {
          $or: [
            { original_name: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [currentFolder, folders, files] = await Promise.all([
      currentFolderId ? Folder.findOne({ _id: currentFolderId, organization_id: organizationId }).populate('owner_id', 'email display_name').lean() : Promise.resolve(null),
      Folder.find({ parent_id: currentFolderId, organization_id: organizationId, ...baseNameQuery })
        .populate('owner_id', 'email display_name')
        .sort({ name: 1 })
        .lean(),
      CRMFile.find({ folder_id: currentFolderId, organization_id: organizationId, ...fileSearchQuery })
        .populate('owner_id', 'email display_name')
        .populate('contact_id', 'first_name last_name')
        .populate('deal_id', 'title')
        .populate('company_id', 'name')
        .populate('folder_id', 'name parent_id')
        .sort({ original_name: 1 })
        .lean()
    ]);

    res.json({
      status: true,
      message: 'Folder contents retrieved successfully',
      data: {
        current_folder: currentFolder,
        folders,
        files
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Failed to browse folder' });
  }
};
