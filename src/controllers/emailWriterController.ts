import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { generateEmail } from '../utils/gemini';
import { Contact } from '../models/Contact';
import { Deal } from '../models/Deal';
import { Company } from '../models/Company';
import { requireOrganization } from '../utils/tenant';

interface GenerateEmailBody {
  contact_id?: string;
  deal_id?: string;
  company_id?: string;
  purpose: string;
  tone: string;
  length?: string;
  recipient_name?: string;
  sender_name?: string;
  key_points?: string[];
  custom_instructions?: string;
  subject?: string;
}

export const generateEmailHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      contact_id,
      deal_id,
      company_id,
      purpose = 'follow_up',
      tone = 'professional',
      length = 'medium',
      recipient_name: rawRecipientName,
      sender_name: rawSenderName,
      key_points,
      custom_instructions,
      subject
    } = req.body as GenerateEmailBody;

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const context: Record<string, unknown> = {};

    if (contact_id && mongoose.Types.ObjectId.isValid(contact_id)) {
      const contact = await Contact.findOne({ _id: contact_id, organization_id: organizationId })
        .populate('company_id', 'name industry')
        .lean();

      if (contact) {
        context.contact_name = `${contact.first_name} ${contact.last_name}`;
        context.contact_role = contact.role_title;
        context.company_name = (contact.company_id as unknown as { name?: string })?.name;
        context.company_industry = (contact.company_id as unknown as { industry?: string })?.industry;
      }
    }

    if (company_id && mongoose.Types.ObjectId.isValid(company_id)) {
      const company = await Company.findOne({ _id: company_id, organization_id: organizationId }).lean();
      if (company) {
        context.company_name = context.company_name || company.name;
        context.company_industry = context.company_industry || company.industry;
      }
    }

    if (deal_id && mongoose.Types.ObjectId.isValid(deal_id)) {
      const deal = await Deal.findOne({ _id: deal_id, organization_id: organizationId })
        .populate('company_id', 'name')
        .lean();
      if (deal) {
        context.deal_title = deal.title;
        context.deal_value = deal.value;
        context.company_name = context.company_name || (deal.company_id as unknown as { name?: string })?.name;
      }
    }

    const emailData = await generateEmail({
      purpose,
      tone,
      length,
      recipient_name: rawRecipientName || (context.contact_name as string) || undefined,
      sender_name: rawSenderName || req.user?.display_name,
      key_points,
      custom_instructions,
      subject,
      context: Object.keys(context).length > 0
        ? context as {
            company_name?: string;
            company_industry?: string;
            deal_title?: string;
            deal_value?: number;
            contact_name?: string;
            contact_role?: string;
          }
        : undefined
    });

    res.json({
      status: true,
      message: 'Email generated successfully',
      data: emailData
    });
  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to generate email'
    });
  }
};
