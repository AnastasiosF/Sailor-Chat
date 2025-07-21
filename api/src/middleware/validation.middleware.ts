import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../../../shared/src/types';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: Record<string, string[]> = {};

      errors.array().forEach(error => {
        const field = error.type === 'field' ? error.path : 'general';
        if (!errorMap[field]) {
          errorMap[field] = [];
        }
        errorMap[field].push(error.msg);
      });

      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        errors: errorMap,
      };

      res.status(400).json(response);
      return;
    }

    next();
  };
};

// Common validation rules
export const authValidations = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('display_name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be between 1 and 100 characters')
      .trim(),
  ],
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  refreshToken: [
    body('refresh_token')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  verifyEmail: [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required'),
    body('type')
      .isIn(['signup', 'email_change'])
      .withMessage('Type must be either signup or email_change'),
  ],
  resendVerification: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ],
};

export const messageValidations = {
  send: [
    body('chat_id')
      .isUUID()
      .withMessage('Valid chat ID is required'),
    body('content')
      .isLength({ min: 1, max: 4000 })
      .withMessage('Message content must be between 1 and 4000 characters')
      .trim(),
    body('type')
      .optional()
      .isIn(['text', 'image', 'file', 'system'])
      .withMessage('Invalid message type'),
    body('reply_to_id')
      .optional()
      .isUUID()
      .withMessage('Reply to ID must be a valid UUID'),
  ],
};

export const chatValidations = {
  create: [
    body('type')
      .isIn(['direct', 'group'])
      .withMessage('Chat type must be either direct or group'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Chat name must be between 1 and 100 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Chat description must be less than 500 characters')
      .trim(),
    body('participant_ids')
      .isArray({ min: 1 })
      .withMessage('At least one participant is required'),
    body('participant_ids.*')
      .isUUID()
      .withMessage('All participant IDs must be valid UUIDs'),
  ],
  update: [
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Chat name must be between 1 and 100 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Chat description must be less than 500 characters')
      .trim(),
  ],
};

export const userValidations = {
  update: [
    body('display_name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be between 1 and 100 characters')
      .trim(),
    body('status')
      .optional()
      .isIn(['online', 'away', 'busy', 'offline'])
      .withMessage('Invalid status value'),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL'),
  ],
};

export const reactionValidations = {
  add: [
    body('message_id')
      .isUUID()
      .withMessage('Valid message ID is required'),
    body('emoji')
      .isLength({ min: 1, max: 10 })
      .withMessage('Emoji must be between 1 and 10 characters')
      .trim(),
  ],
};
