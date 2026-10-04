// IP real de quien hace la petición. En producción el servidor queda detrás de Cloudflare
// (que va delante de Render), así que req.ip sería la de Cloudflare y muchas personas
// compartirían el mismo contador. Cloudflare envía la IP original en CF-Connecting-IP.
export const clientIp = (req) => {
  const cf = req.headers['cf-connecting-ip'];
  return (typeof cf === 'string' && cf.trim()) || req.ip || 'desconocida';
};
