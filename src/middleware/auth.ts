/**
 * Authentication middleware
 * Handles JWT token verification and user authentication
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { ensureUserOrganization } from '../utils/organization';

/**
 * Verify JWT token and attach user to request
 * Checks for valid Bearer token in Authorization header
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.crm_AT || req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      res.status(401).json({
        status: false,
        message: 'No token provided'
      });
      return;
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.is_active) {
      res.status(401).json({
        status: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    const organizationId = await ensureUserOrganization(user);
    const organization = await Organization.findById(organizationId).select('is_active').lean();
    if (!organization?.is_active) {
      res.status(401).json({
        status: false,
        message: 'Organization is inactive'
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organization_id: organizationId.toString(),
      display_name: user.display_name
    };

    next();
  } catch (error) {
    res.status(401).json({
      status: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Role-based authorization middleware
 * Factory function that returns middleware to check user roles
 * @param roles - Allowed roles for the route
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: false,
        message: "You don't have permission to perform this action"
      });
      return;
    }

    next();
  };
};
