import express from 'express';
import userController from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(authenticateToken);

// Validation schemas
const searchUsersValidation = [
  query('query').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
];

const userIdValidation = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
];

const updateProfileValidation = [
  body('display_name').optional().isLength({ min: 1, max: 100 }).withMessage('Display name must be 1-100 characters'),
  body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
  body('status').optional().isIn(['online', 'away', 'busy', 'offline']).withMessage('Status must be valid'),
];

const updateStatusValidation = [
  body('status').optional().isIn(['online', 'away', 'busy', 'offline']).withMessage('Status must be valid'),
  body('is_online').optional().isBoolean().withMessage('is_online must be a boolean'),
];

// Routes
router.get('/search', validateRequest(searchUsersValidation), userController.searchUsers);
router.get('/:userId', validateRequest(userIdValidation), userController.getUserProfile);
router.put('/profile', validateRequest(updateProfileValidation), userController.updateUserProfile);
router.put('/status', validateRequest(updateStatusValidation), userController.updateUserStatus);

export default router;
