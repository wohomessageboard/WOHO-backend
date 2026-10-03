import crypto from 'crypto';
import { sendDailyDigest } from '../services/digest.js';

// Lo llama un programador externo UNA vez al día (Vercel Cron, Render Cron Job, GitHub
// Actions, cron-job.org...). Protegido con CRON_SECRET: sin él configurado, el endpoint
// queda deshabilitado.
export const dailyDigest = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const sent = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  const valid = secret && sent.length === secret.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(secret));
  if (!valid) return res.status(401).json({ error: 'No autorizado' });

  try {
    return res.status(200).json(await sendDailyDigest());
  } catch (error) {
    console.error('Error en el resumen diario:', error);
    return res.status(500).json({ error: 'No se pudo enviar el resumen' });
  }
};
