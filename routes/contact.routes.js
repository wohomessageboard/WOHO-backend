import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { sendContactMessage } from '../controllers/contact.controller.js';

const router = Router();

router.post('/', optionalAuth, sendContactMessage);

export default router;
