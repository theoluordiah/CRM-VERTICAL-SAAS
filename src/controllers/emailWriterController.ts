import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import {
  EMAIL_LENGTHS,
  EMAIL_PURPOSES,
  EMAIL_TONES,
  EmailLength,
  EmailPurpose,
  EmailTone,
  generateEmail
} from '../utils/groq';
import { Contact } from '../models/Contact';
import { Deal } from '../models/Deal';
import { Company } from '../models/Company';
import { requireOrganization } from '../utils/tenant';

interface GenerateEmailBody {
  contact_id?: string;
  deal_id?: string;
  company_id?: string;
  purpose?: string;
  tone?: string;
  length?: string;
  recipient_name?: string;
  sender_name?: string;
  key_points?: unknown;
  additional_notes?: string;
  custom_instructions?: string;
  subject?: string;
}

type EmailContext = {
  company_name?: string;
  company_industry?: string;
  deal_title?: string;
  deal_value?: number;
  contact_name?: string;
  contact_role?: string;
};

const MAX_KEY_POINTS = 10;
const MAX_KEY_POINT_LENGTH = 220;
const EMAIL_WRITER_OPTIONS = ['friendly', 'professional', 'follow_up', 'cold_outreach', 'thank_you'] as const;

type EmailWriterOption = typeof EMAIL_WRITER_OPTIONS[number];

const asTrimmedString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
};

const isOneOf = <T extends readonly string[]>(value: string, values: T): value is T[number] =>
  (values as readonly string[]).includes(value);

const validateObjectId = (value: string | undefined, label: string): string | undefined => {
  if (!value) return undefined;
  if (!mongoose.Types.ObjectId.isValid(value)) return `${label} is invalid`;
  return undefined;
};

const normalizeWriterOption = (value: string): { tone: EmailTone; purpose: EmailPurpose } => {
  if (isOneOf(value, EMAIL_TONES)) {
    return { tone: value, purpose: 'follow_up' };
  }

  const optionMap: Record<EmailWriterOption, { tone: EmailTone; purpose: EmailPurpose }> = {
    friendly: { tone: 'friendly', purpose: 'follow_up' },
    professional: { tone: 'professional', purpose: 'follow_up' },
    follow_up: { tone: 'professional', purpose: 'follow_up' },
    cold_outreach: { tone: 'professional', purpose: 'cold_outreach' },
    thank_you: { tone: 'friendly', purpose: 'thank_you' }
  };

  return optionMap[value as EmailWriterOption] || { tone: 'professional', purpose: 'follow_up' };
};

const normalizeKeyPoints = (value: unknown): { keyPoints?: string[]; error?: string } => {
  if (value === undefined) return {};
  if (!Array.isArray(value)) return { error: 'key_points must be an array of strings' };
  if (value.length > MAX_KEY_POINTS) return { error: `key_points cannot contain more than ${MAX_KEY_POINTS} items` };

  const keyPoints = value
    .map((point) => asTrimmedString(point, MAX_KEY_POINT_LENGTH))
    .filter((point): point is string => Boolean(point));

  if (keyPoints.length !== value.length) return { error: 'key_points must only contain non-empty strings' };
  return { keyPoints };
};

export const generateEmailHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as GenerateEmailBody;
    const contactId = asTrimmedString(body.contact_id, 80);
    const companyId = asTrimmedString(body.company_id, 80);
    const dealId = asTrimmedString(body.deal_id, 80);
    const writerOption = asTrimmedString(body.tone, 50) || 'professional';
    const purpose = asTrimmedString(body.purpose, 50);
    const length = asTrimmedString(body.length, 50) || 'medium';
    const errors = [
      validateObjectId(contactId, 'contact_id'),
      validateObjectId(companyId, 'company_id'),
      validateObjectId(dealId, 'deal_id')
    ].filter((error): error is string => Boolean(error));

    if (!isOneOf(writerOption, EMAIL_WRITER_OPTIONS) && !isOneOf(writerOption, EMAIL_TONES)) {
      errors.push('tone has an invalid value');
    }

    if (purpose && !isOneOf(purpose, EMAIL_PURPOSES)) errors.push('purpose has an invalid value');
    if (!isOneOf(length, EMAIL_LENGTHS)) errors.push('length has an invalid value');

    const { keyPoints, error: keyPointsError } = normalizeKeyPoints(body.key_points);
    if (keyPointsError) errors.push(keyPointsError);

    if (errors.length > 0) {
      res.status(400).json({ status: false, message: 'Validation failed', errors });
      return;
    }

    const organizationId = requireOrganization(req, res);
    if (!organizationId) return;

    const context: EmailContext = {};
    const normalizedWriterOption = normalizeWriterOption(writerOption);

    if (contactId) {
      const contact = await Contact.findOne({ _id: contactId, organization_id: organizationId })
        .populate('company_id', 'name industry')
        .lean();

      if (!contact) {
        res.status(404).json({ status: false, message: 'Contact not found' });
        return;
      }

      context.contact_name = `${contact.first_name} ${contact.last_name}`.trim();
      context.contact_role = contact.role_title;
      context.company_name = (contact.company_id as unknown as { name?: string })?.name;
      context.company_industry = (contact.company_id as unknown as { industry?: string })?.industry;
    }

    if (companyId) {
      const company = await Company.findOne({ _id: companyId, organization_id: organizationId }).lean();

      if (!company) {
        res.status(404).json({ status: false, message: 'Company not found' });
        return;
      }

      context.company_name = context.company_name || company.name;
      context.company_industry = context.company_industry || company.industry;
    }

    if (dealId) {
      const deal = await Deal.findOne({ _id: dealId, organization_id: organizationId })
        .populate('company_id', 'name')
        .lean();

      if (!deal) {
        res.status(404).json({ status: false, message: 'Deal not found' });
        return;
      }

      context.deal_title = deal.title;
      context.deal_value = deal.value;
      context.company_name = context.company_name || (deal.company_id as unknown as { name?: string })?.name;
    }

    const emailData = await generateEmail({
      purpose: (purpose as EmailPurpose | undefined) || normalizedWriterOption.purpose,
      tone: normalizedWriterOption.tone,
      length: length as EmailLength,
      recipient_name: asTrimmedString(body.recipient_name, 120) || context.contact_name,
      sender_name: asTrimmedString(body.sender_name, 120) || req.user?.display_name,
      key_points: keyPoints,
      custom_instructions: asTrimmedString(body.additional_notes, 1200) || asTrimmedString(body.custom_instructions, 1200),
      subject: asTrimmedString(body.subject, 180),
      context: Object.keys(context).length > 0 ? context : undefined
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
