import { Router } from 'express';
import * as authController from './auth.controller';
import * as authDto from './auth.dto';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Create user profile (requires Supabase auth session)
 * @access  Private (must have valid Supabase token)
 */
router.post(
  '/register',
  authenticate,
  authDto.registerValidation,
  authController.register
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

export default router;
