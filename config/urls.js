// FRONTEND_URL puede traer varias direcciones separadas por coma (para CORS). Para armar
// enlaces (correos, tarjetas de compartir) se usa siempre la primera, que es la principal.
export const frontendOrigins = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

export const frontendUrl = () => frontendOrigins()[0];
