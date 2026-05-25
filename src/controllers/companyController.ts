import { Response } from 'express';
import mongoose from 'mongoose';
import { Company, ICompany } from '../models/Company';
import { Contact } from '../models/Contact';
import { Deal } from '../models/Deal';
import { AuthRequest, PaginatedResponse } from '../types';
import { requireOrganization } from '../utils/tenant';

interface CompanyQuery {
  page?: number;
  limit?: number;
  search?: string;
  owner_id?: string;
  industry?: string;
}

export const listCompanies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, owner_id, industry } = req.query as CompanyQuery;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const query: Record<string, unknown> = { organization_id: organizationId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
        { website: { $regex: search, $options: 'i' } }
      ];
    }

    if (owner_id) query.owner_id = new mongoose.Types.ObjectId(owner_id);
    if (industry) query.industry = industry;

    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .populate('owner_id', 'email display_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    const response: PaginatedResponse<ICompany> = {
      status: true,
      message: 'Companies retrieved successfully',
      data: companies,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch companies'
    });
  }
};

export const getCompanyById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const company = await Company.findOne({ _id: id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .lean();

    if (!company) {
      res.status(404).json({
        status: false,
        message: 'Company not found'
      });
      return;
    }

    res.json({ status: true, message: 'Company retrieved successfully', data: company });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch company'
    });
  }
};

interface CreateCompanyBody {
  name: string;
  industry?: string;
  website?: string;
  notes?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const createCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, industry, website, notes, contact_person, email, phone, address } = req.body as CreateCompanyBody;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const company = new Company({
      name,
      industry,
      website,
      notes,
      contact_person,
      email,
      phone,
      address,
      owner_id: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      organization_id: organizationId
    });

    await company.save();

    const populatedCompany = await Company.findOne({ _id: company._id, organization_id: organizationId })
      .populate('owner_id', 'email display_name');

    res.status(201).json({ status: true, message: 'Company created successfully', data: populatedCompany });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to create company'
    });
  }
};

interface UpdateCompanyBody {
  name?: string;
  industry?: string;
  website?: string;
  notes?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const updateCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updateData = req.body as UpdateCompanyBody;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const company = await Company.findOneAndUpdate(
      { _id: id, organization_id: organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('owner_id', 'email display_name');

    if (!company) {
      res.status(404).json({
        status: false,
        message: 'Company not found'
      });
      return;
    }

    res.json({ status: true, message: 'Company updated successfully', data: company });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update company'
    });
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const company = await Company.findOneAndDelete({ _id: id, organization_id: organizationId });

    if (!company) {
      res.status(404).json({
        status: false,
        message: 'Company not found'
      });
      return;
    }

    res.json({ status: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to delete company'
    });
  }
};

export const getCompanyContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const contacts = await Contact.find({ company_id: id, organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .sort({ created_at: -1 })
      .lean();

    res.json({ status: true, message: 'Company contacts retrieved successfully', data: contacts });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch company contacts'
    });
  }
};

export const getCompanyDeals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const deals = await Deal.find({ company_id: id, organization_id: organizationId })
      .populate('stage_id', 'name')
      .populate('contact_id', 'first_name last_name')
      .populate('owner_id', 'email display_name')
      .sort({ created_at: -1 })
      .lean();

    res.json({ status: true, message: 'Company deals retrieved successfully', data: deals });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch company deals'
    });
  }
};

export const getCompanyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: false,
        message: 'Invalid company ID'
      });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const [contactCount, dealCount, dealValue] = await Promise.all([
      Contact.countDocuments({ company_id: id, organization_id: organizationId }),
      Deal.countDocuments({ company_id: id, organization_id: organizationId }),
      Deal.aggregate([
        { $match: { company_id: new mongoose.Types.ObjectId(id), organization_id: organizationId } },
        { $group: { _id: null, total: { $sum: '$value' } } }
      ])
    ]);

    res.json({
      status: true,
      message: 'Company stats retrieved successfully',
      data: {
        contact_count: contactCount,
        deal_count: dealCount,
        total_deal_value: dealValue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch company stats'
    });
  }
};

export const exportCompanies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { format = 'csv' } = req.query;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const companies = await Company.find({ organization_id: organizationId })
      .populate('owner_id', 'email display_name')
      .sort({ created_at: -1 })
      .lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="companies.json"');
      res.json({ status: true, message: 'Companies exported successfully', data: companies });
      return;
    }

    const headers = [
      'name',
      'industry',
      'website',
      'email',
      'phone',
      'address',
      'contact_person',
      'notes',
      'owner_email',
      'owner_name',
      'created_at'
    ];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = companies.map((company) =>
      [
        escapeCSV(company.name),
        escapeCSV(company.industry),
        escapeCSV(company.website),
        escapeCSV(company.email),
        escapeCSV(company.phone),
        escapeCSV(company.address),
        escapeCSV(company.contact_person),
        escapeCSV(company.notes),
        escapeCSV((company.owner_id as unknown as { email?: string })?.email),
        escapeCSV((company.owner_id as unknown as { display_name?: string })?.display_name),
        escapeCSV(company.created_at)
      ].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="companies.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to export companies'
    });
  }
};
