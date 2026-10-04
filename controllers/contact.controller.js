import pool from '../config/db.js';
import { normalizeEmail } from './auth.controller.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Límite simple por IP en memoria: 5 mensajes por hora. Suficiente contra abuso básico;
// si el servidor se escala a varias instancias conviene moverlo a la base o a un servicio.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

const tooMany = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
};

// Formulario de contacto: el mensaje llega a la bandeja del panel de admin.
export const sendContactMessage = async (req, res) => {
  try {
    const { name, message, website } = req.body;

    // Campo trampa: las personas no lo ven; los bots suelen rellenarlo. Se responde "ok" sin guardar.
    if (website) return res.status(201).json({ message: 'Mensaje enviado' });

    if (tooMany(req.ip)) {
      return res.status(429).json({ error: 'Has enviado varios mensajes seguidos. Intenta de nuevo más tarde.' });
    }

    const cleanName = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const cleanMessage = String(message ?? '').trim();
    const email = normalizeEmail(req.body.email);

    if (!cleanName) return res.status(400).json({ error: 'Cuéntanos tu nombre' });
    if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ error: 'Escribe un correo válido para poder responderte' });
    if (cleanMessage.length < 10) return res.status(400).json({ error: 'Escribe un mensaje de al menos 10 caracteres' });
    if (cleanMessage.length > 2000) return res.status(400).json({ error: 'El mensaje es demasiado largo (máx. 2000 caracteres)' });

    await pool.query(
      `INSERT INTO inbox_messages (kind, user_id, name, email, message)
       VALUES ('contact', $1, $2, $3, $4)`,
      [req.user?.id ?? null, cleanName, email, cleanMessage]
    );

    return res.status(201).json({ message: 'Gracias, recibimos tu mensaje. Te responderemos al correo que dejaste.' });
  } catch (error) {
    console.error('Error en sendContactMessage:', error);
    return res.status(500).json({ error: 'No pudimos enviar tu mensaje. Intenta de nuevo.' });
  }
};
