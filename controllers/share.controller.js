import pool from '../config/db.js';
import { frontendUrl } from '../config/urls.js';
import { imageUrlsFrom } from '../config/cloudinary.js';

// Página mínima que WhatsApp, Telegram, etc. leen para armar la tarjeta ("embed") del
// aviso: título, resumen y foto. Las personas que abren el enlace pasan enseguida a la
// aplicación. No incluye nada de quien publica, solo lo que ya ve cualquier visitante.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOGO = 'https://res.cloudinary.com/dpxpixlpl/image/upload/v1772886330/WOHO_logo_uxi9wo.png';

// Recorte 1200x630 (el formato de las tarjetas) para fotos de Cloudinary.
const cardImage = (url) => (/\/upload\//.test(url) ? url.replace('/upload/', '/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/') : url);

export const sharePost = async (req, res) => {
  const frontend = frontendUrl();
  const id = Number(req.params.id);
  const target = Number.isInteger(id) ? `${frontend}/post/${id}` : frontend;

  let title = 'WOHO · Tablón de avisos Working Holiday';
  let description = 'Alojamiento, trabajo y compañeros de ruta de viajero a viajero.';
  let image = LOGO;

  try {
    if (Number.isInteger(id)) {
      const result = await pool.query(
        `SELECT p.title, p.description, p.images, c.name AS country, ci.name AS city
         FROM posts p
         LEFT JOIN countries c ON c.id = p.country_id
         LEFT JOIN cities ci ON ci.id = p.city_id
         JOIN users u ON u.id = p.user_id
         WHERE p.id = $1 AND p.is_active = true AND u.deletion_requested_at IS NULL AND (p.expires_at >= CURRENT_DATE OR p.expires_at IS NULL)`,
        [id]
      );
      if (result.rowCount > 0) {
        const p = result.rows[0];
        const where = [p.city, p.country].filter(Boolean).join(', ');
        title = `${p.title} · WOHO`;
        description = `${where ? where + ' — ' : ''}${String(p.description).replace(/\s+/g, ' ').slice(0, 160)}`;
        const first = imageUrlsFrom(p.images)[0];
        if (first) image = cardImage(first);
      }
    }
  } catch (error) {
    console.error('Error en sharePost:', error); // si falla, se muestra la tarjeta genérica
  }

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  res.send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:site_name" content="WOHO">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(target)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
</head>
<body>
<p>Abriendo el aviso… <a href="${esc(target)}">Ir a WOHO</a></p>
<script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')});</script>
</body>
</html>`);
};
