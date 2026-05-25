import { Request, Response, NextFunction } from 'express';

type FieldRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  minLength?: number;
  maxLength?: number;
  enum?: readonly string[];
};

type Schema = Record<string, FieldRule>;

export const validateBody = (schema: Schema) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = req.body?.[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rule.type === 'array') {
      if (!Array.isArray(value)) errors.push(`${field} must be an array`);
    } else if (rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be a ${rule.type}`);
    }

    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) errors.push(`${field} is too short`);
      if (rule.maxLength && value.length > rule.maxLength) errors.push(`${field} is too long`);
      if (rule.enum && !rule.enum.includes(value)) errors.push(`${field} has an invalid value`);
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ status: false, message: 'Validation failed', errors });
    return;
  }

  next();
};
