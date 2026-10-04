import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { clientIp } from '../utils/clientIp.js';

// Límites por IP. Son en memoria: valen para una sola instancia del servidor (el caso de
// Render con un servicio). Si algún día hay varias instancias, hay que moverlos a Redis.
// En los tests se desactivan (RATE_LIMIT_DISABLED=1) salvo que se pida lo contrario.
const disabled = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_DISABLED !== '0';

const make = ({ windowMs, limit, message, ...extra }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: disabled,
    keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
    handler: (req, res) => res.status(429).json({ error: message }),
    ...extra,
  });

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// Toda la API: frena ráfagas y raspado masivo.
export const apiLimiter = make({
  windowMs: 15 * MIN,
  limit: 600,
  message: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.',
});

// Inicio de sesión: solo cuentan los intentos fallidos (frena la fuerza bruta).
export const loginLimiter = make({
  windowMs: 15 * MIN,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.',
});

export const registerLimiter = make({
  windowMs: HOUR,
  limit: 10,
  message: 'Se crearon muchas cuentas desde tu conexión. Inténtalo de nuevo en una hora.',
});

export const passwordLimiter = make({
  windowMs: HOUR,
  limit: 10,
  message: 'Demasiadas solicitudes de recuperación. Inténtalo de nuevo en una hora.',
});

// Acciones que escriben (publicar, reportar, contactar, subir fotos).
export const writeLimiter = make({
  windowMs: HOUR,
  limit: 60,
  message: 'Hiciste muchas acciones seguidas. Espera un rato e inténtalo de nuevo.',
});

export const makeLimiter = make; // para pruebas
