import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../../../shared/src/types';
import SupabaseService from '../services/supabase.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required',
    };
    res.status(401).json(response);
    return;
  }

  try {
    const supabase = SupabaseService.getInstance();
    const { user, error } = await supabase.verifyToken(token);

    if (error || !user) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Token verification failed',
    };
    res.status(500).json(response);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const supabase = SupabaseService.getInstance();
    const { user, error } = await supabase.verifyToken(token);

    if (!error && user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication required',
    };
    res.status(401).json(response);
    return;
  }

  // Check if user is admin (you can modify this logic based on your needs)
  if (req.user.user_metadata?.role !== 'admin') {
    const response: ApiResponse = {
      success: false,
      error: 'Admin access required',
    };
    res.status(403).json(response);
    return;
  }

  next();
};
