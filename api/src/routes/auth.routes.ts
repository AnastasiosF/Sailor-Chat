import express from 'express';
import authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, authValidations } from '../middleware/validation.middleware';

const router = express.Router();

// Public routes
router.post('/register',
  validateRequest(authValidations.register),
  authController.register
);

router.post('/login',
  validateRequest(authValidations.login),
  authController.login
);

router.post('/refresh',
  validateRequest(authValidations.refreshToken),
  authController.refreshToken
);

router.post('/verify-email',
  validateRequest(authValidations.verifyEmail),
  authController.verifyEmail
);

router.post('/resend-verification',
  validateRequest(authValidations.resendVerification),
  authController.resendVerification
);

// Protected routes
router.post('/logout',
  authenticateToken,
  authController.logout
);

router.get('/me',
  authenticateToken,
  authController.getMe
);

export default router;
