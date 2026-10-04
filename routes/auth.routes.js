import { Router } from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { registerLimiter, loginLimiter, passwordLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/register', registerLimiter, register);

router.post('/login', loginLimiter, login);

router.post('/forgot-password', passwordLimiter, forgotPassword);
router.post('/reset-password', passwordLimiter, resetPassword);

export default router;
