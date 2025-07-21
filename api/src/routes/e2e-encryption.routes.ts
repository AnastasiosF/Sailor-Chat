import express from 'express';
import e2eController from '../controllers/e2e-encryption.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = express.Router();

// Apply authentication middleware to all E2E routes
router.use(authenticateToken);

// Validation schemas
const setupKeysValidation = [
  body('public_key_encryption').isString().isLength({ min: 100 }).withMessage('Invalid encryption public key'),
  body('public_key_signing').isString().isLength({ min: 100 }).withMessage('Invalid signing public key'),
  body('encrypted_private_keys').isString().isLength({ min: 100 }).withMessage('Invalid encrypted private keys'),
  body('salt').isString().isLength({ min: 32 }).withMessage('Invalid salt'),
  body('nonce').isString().isLength({ min: 16 }).withMessage('Invalid nonce'),
];

const initiateKeyExchangeValidation = [
  body('recipient_id').isUUID().withMessage('Recipient ID must be a valid UUID'),
  body('chat_id').isUUID().withMessage('Chat ID must be a valid UUID'),
  body('ephemeral_public_key').isString().isLength({ min: 100 }).withMessage('Invalid ephemeral public key'),
];

const completeKeyExchangeValidation = [
  body('session_id').isUUID().withMessage('Session ID must be a valid UUID'),
  body('ephemeral_public_key').isString().isLength({ min: 100 }).withMessage('Invalid ephemeral public key'),
];

const registerDeviceValidation = [
  body('device_name').isString().isLength({ min: 1, max: 100 }).withMessage('Device name must be 1-100 characters'),
  body('device_fingerprint').isString().isLength({ min: 32, max: 64 }).withMessage('Invalid device fingerprint'),
  body('public_key_encryption').isString().isLength({ min: 100 }).withMessage('Invalid encryption public key'),
  body('public_key_signing').isString().isLength({ min: 100 }).withMessage('Invalid signing public key'),
];

const userIdValidation = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
];

// Routes
router.post('/setup-keys', validateRequest(setupKeysValidation), e2eController.setupKeys);
router.get('/public-keys/:userId', validateRequest(userIdValidation), e2eController.getPublicKeys);
router.post('/key-exchange/initiate', validateRequest(initiateKeyExchangeValidation), e2eController.initiateKeyExchange);
router.post('/key-exchange/complete', validateRequest(completeKeyExchangeValidation), e2eController.completeKeyExchange);
router.get('/key-exchange/pending', e2eController.getPendingKeyExchanges);
router.post('/devices', validateRequest(registerDeviceValidation), e2eController.registerDevice);
router.get('/devices', e2eController.getUserDevices);

export default router;
