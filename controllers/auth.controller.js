import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { clientIp } from '../utils/clientIp.js';
import { frontendUrl } from '../config/urls.js';
import { sendMail } from '../services/mailer.js';
import { TERMS_VERSION, MIN_AGE } from '../config/legal.js';
import { normalizePhone } from '../utils/phone.js';

// Un solo correo, sin importar mayúsculas ni espacios: "Ana@X.com " y "ana@x.com" son la misma cuenta.
export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
export const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res) => {
  try {
    const { name, password, accepted_terms, confirmed_age, phone_whatsapp } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Escribe un correo válido' });
    }

    if (confirmed_age !== true) {
      return res.status(400).json({ error: `Debes confirmar que tienes al menos ${MIN_AGE} años para crear una cuenta` });
    }

    if (accepted_terms !== true) {
      return res.status(400).json({ error: 'Para crear tu cuenta debes aceptar los Términos y Condiciones y la Política de Privacidad' });
    }

    if (String(password).length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    // El contacto entre personas es solo por WhatsApp, así que se pide desde el registro.
    const phone = normalizePhone(phone_whatsapp);
    if (!phone) {
      return res.status(400).json({ error: 'Escribe tu WhatsApp con código de país, por ejemplo +56 9 1234 5678', code: 'PHONE_REQUIRED' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role, terms_accepted_at, terms_version, age_confirmed_at, phone_whatsapp)
       VALUES ($1, $2, $3, $4, now(), $5, now(), $6)
       RETURNING id, name, email, role, avatar_url, bio, instagram_handle, terms_version, phone_whatsapp`,
      [name, email, hashedPassword, 'user', TERMS_VERSION, phone]
    );

    const userData = newUser.rows[0];

    const payload = { id: userData.id, email: userData.email, role: userData.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    const userToFront = { 
      id: userData.id, 
      name: userData.name, 
      email: userData.email, 
      role: userData.role,
      avatar: userData.avatar_url || null,
      bio: userData.bio || null,
      instagram_handle: userData.instagram_handle || null,
      phone_whatsapp: userData.phone_whatsapp || null,
      terms_version: userData.terms_version || null
    };

    return res.status(201).json({ token, user: userToFront });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error en register:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar' });
  }
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const user = await pool.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
    if (user.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userData = user.rows[0];

    if (!userData.is_active) {
      return res.status(403).json({ error: 'Tu cuenta ha sido suspendida por el administrador' });
    }

    const validPassword = await bcryptjs.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = { id: userData.id, email: userData.email, role: userData.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    const userToFront = { 
      id: userData.id, 
      name: userData.name, 
      email: userData.email, 
      role: userData.role,
      avatar: userData.avatar_url || null,
      bio: userData.bio || null,
      instagram_handle: userData.instagram_handle || null,
      terms_version: userData.terms_version || null
    };

    return res.status(200).json({ token, user: userToFront });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
};

// ---- Recuperar contraseña -------------------------------------------------------
// 1) forgotPassword: siempre responde lo mismo exista o no el correo (para no revelar quién
//    tiene cuenta). Si existe, envía un enlace de un solo uso que vence en 1 hora.
// 2) resetPassword: valida el código, cambia la contraseña y lo invalida.
// El código viaja solo por correo; en la base se guarda su hash (SHA-256).
const RESET_MINUTES = 60;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Límite en memoria: 3 solicitudes por hora por IP y por correo (evita gastar el cupo de
// correos y el acoso a una persona).
const resetHits = new Map();
const tooManyResets = (key) => {
  const now = Date.now();
  const recent = (resetHits.get(key) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 3) { resetHits.set(key, recent); return true; }
  recent.push(now);
  resetHits.set(key, recent);
  return false;
};

const GENERIC_FORGOT = { message: 'Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa tu bandeja (y el spam). Vale por 1 hora.' };

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Escribe un correo válido' });

    if (tooManyResets(`ip:${clientIp(req)}`) || tooManyResets(`mail:${email}`)) {
      return res.status(429).json({ error: 'Pediste varios enlaces seguidos. Espera un rato e inténtalo de nuevo.' });
    }

    const found = await pool.query('SELECT id, name, is_active FROM users WHERE lower(email) = $1', [email]);
    if (found.rowCount > 0 && found.rows[0].is_active) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL', [found.rows[0].id]);
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [found.rows[0].id, hashToken(token), RESET_MINUTES]
      );

      const link = `${frontendUrl()}/restablecer?token=${token}`;
      try {
        await sendMail({
          to: email,
          subject: 'Crea una contraseña nueva en WOHO',
          text: `Hola ${found.rows[0].name},\n\nPediste cambiar tu contraseña. Abre este enlace (vale por 1 hora y se usa una sola vez):\n\n${link}\n\nSi no fuiste tú, ignora este correo: tu contraseña no cambia.`,
        });
      } catch (mailError) {
        // No se le cuenta a quien consulta si el envío falló (sería revelar que el correo existe).
        console.error('No se pudo enviar el correo de recuperación:', mailError.message);
      }
    }

    return res.status(200).json(GENERIC_FORGOT);
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ error: 'No pudimos procesar tu solicitud. Intenta de nuevo.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'El enlace no es válido.' });
    if (!password || String(password).length < MIN_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const found = await pool.query(
      'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()',
      [hashToken(token)]
    );
    if (found.rowCount === 0) {
      return res.status(400).json({ error: 'El enlace venció o ya se usó. Pide uno nuevo.' });
    }

    const hashed = await bcryptjs.hash(password, await bcryptjs.genSalt(10));
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, found.rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [found.rows[0].user_id]);

    return res.status(200).json({ message: 'Listo, cambiaste tu contraseña. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ error: 'No pudimos cambiar la contraseña. Intenta de nuevo.' });
  }
};
