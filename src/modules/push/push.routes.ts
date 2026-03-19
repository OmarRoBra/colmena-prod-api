import { Router } from 'express';
import * as pushController from './push.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Public: get VAPID public key (needed before auth for subscription)
router.get('/vapid-key', pushController.getVapidKey);

// Authenticated: manage subscriptions
router.post('/subscribe', authenticate, pushController.subscribe);
router.post('/unsubscribe', authenticate, pushController.unsubscribe);

export default router;
