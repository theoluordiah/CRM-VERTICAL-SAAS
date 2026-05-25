import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

interface EmailGenerationInput {
  purpose: string;
  tone: string;
  length?: string;
  recipient_name?: string;
  sender_name?: string;
  key_points?: string[];
  custom_instructions?: string;
  subject?: string;
  context?: {
    company_name?: string;
    company_industry?: string;
    deal_title?: string;
    deal_value?: number;
    contact_name?: string;
    contact_role?: string;
  };
}

interface EmailResult {
  subject: string;
  body: string;
}

const getSystemPrompt = (input: EmailGenerationInput): string => {
  const toneGuide: Record<string, string> = {
    professional: 'Use a formal, business-appropriate tone. Be concise and respectful.',
    friendly: 'Use a warm, approachable tone. Be conversational but still professional.',
    formal: 'Use very formal language. Address the recipient with proper titles and salutations.',
    casual: 'Use a relaxed, informal tone. Feel free to be brief and direct.'
  };

  const lengthGuide: Record<string, string> = {
    short: 'Keep the email very concise — 2-3 short sentences. Get straight to the point.',
    medium: 'Write a standard business email — 3-5 sentences. Cover the essentials without excess detail.',
    detailed: 'Write a comprehensive email — 5-8 sentences. Include relevant details, context, and a clear structure.'
  };

  const purposeGuide: Record<string, string> = {
    cold_outreach: 'Introduce yourself and your company. Clearly state the value proposition. End with a soft call to action.',
    follow_up: 'Reference previous interaction. Reiterate key points. Suggest next steps.',
    proposal: 'Present the proposal clearly. Highlight benefits and value. Include pricing if relevant. End with clear next steps.',
    thank_you: 'Express genuine gratitude. Reference specific actions or interactions. Keep warm and appreciative.',
    meeting_request: 'State purpose of meeting clearly. Suggest specific times/dates. Mention expected duration.',
    re_engagement: 'Acknowledge the gap in communication. Provide a fresh value proposition. Low-pressure call to action.'
  };

  return `You are a professional email writer for a CRM system. Generate a business email with the following specifications:

TONE: ${input.tone}
${toneGuide[input.tone] || toneGuide.professional}

PURPOSE: ${input.purpose}
${purposeGuide[input.purpose] || purposeGuide.follow_up}

LENGTH: ${input.length || 'medium'}
${lengthGuide[input.length || 'medium']}

${input.key_points?.length ? `KEY POINTS TO INCLUDE:\n${input.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}

${input.custom_instructions ? `ADDITIONAL INSTRUCTIONS:\n${input.custom_instructions}` : ''}

${input.subject ? `SUGGESTED SUBJECT LINE (use or improve): ${input.subject}` : ''}

Return ONLY a JSON object with "subject" (a compelling email subject line) and "body" (the full email body as plain text, not HTML). The body should include an appropriate salutation, the main message, and a professional signature. Do not wrap the JSON in markdown code blocks.`;
};

export const generateEmail = async (input: EmailGenerationInput): Promise<EmailResult> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let contextBlock = '';
  if (input.context) {
    const c = input.context;
    contextBlock = `\n\nCRM CONTEXT:\n${[
      c.contact_name ? `Recipient: ${c.contact_name}${c.contact_role ? `, ${c.contact_role}` : ''}` : '',
      c.company_name ? `Company: ${c.company_name}${c.company_industry ? ` (${c.company_industry})` : ''}` : '',
      c.deal_title ? `Deal: ${c.deal_title}${c.deal_value ? ` (Value: $${c.deal_value})` : ''}` : ''
    ].filter(Boolean).join('\n')}`;
  }

  const prompt = `${getSystemPrompt(input)}${contextBlock}\n\n${input.recipient_name ? `Recipient name: ${input.recipient_name}` : ''}\n${input.sender_name ? `Sender name: ${input.sender_name}` : ''}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject || '',
      body: parsed.body || ''
    };
  } catch {
    const subjectMatch = text.match(/"subject"\s*:\s*"([^"]+)"/);
    const bodyMatch = text.match(/"body"\s*:\s*"([^"]+)"/);
    return {
      subject: subjectMatch?.[1] || '',
      body: bodyMatch?.[1] || text
    };
  }
};
