import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { sendContactMessage } from '../controllers/contact.controller.js';
import { writeLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/', writeLimiter, optionalAuth, sendContactMessage);

export default router;
