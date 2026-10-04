import { clientIp } from '../utils/clientIp.js';

// Registro de eventos de seguridad, una línea JSON por evento, para leer en los logs de
// Render: accesos denegados (401/403), límites superados (429) y errores del servidor.
// No guarda cuerpos, cabeceras, tokens ni correos: solo método, ruta sin parámetros de
// consulta, estado, IP y duración.
export const securityLog = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const s = res.statusCode;
    if (s !== 401 && s !== 403 && s !== 429 && s < 500) return;
    console.warn(JSON.stringify({
      evento: 'seguridad',
      t: new Date().toISOString(),
      ip: clientIp(req),
      metodo: req.method,
      ruta: req.baseUrl + (req.route?.path ?? req.path),
      estado: s,
      ms: Date.now() - started,
    }));
  });
  next();
};
