import { Router } from 'express';
import { dailyDigest } from '../controllers/cron.controller.js';

const router = Router();

// GET para Vercel Cron (que llama con GET); POST para el resto de programadores.
router.post('/daily-digest', dailyDigest);

export default router;
