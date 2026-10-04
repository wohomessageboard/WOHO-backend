import pool from '../config/db.js';
import { destroyImagesByUrls, imageUrlsFrom } from '../config/cloudinary.js';

// Elimina una cuenta por completo: sus avisos, favoritos y seguidos (por CASCADE en la
// base), y las fotos de sus avisos y su avatar en Cloudinary. Devuelve false si no existía.
export const removeUserAccount = async (userId) => {
  const posts = await pool.query('SELECT images FROM posts WHERE user_id = $1', [userId]);
  const avatar = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
  const urls = posts.rows.flatMap((r) => imageUrlsFrom(r.images));
  if (avatar.rows[0]?.avatar_url) urls.push(avatar.rows[0].avatar_url);

  const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  if (result.rowCount === 0) return false;

  await destroyImagesByUrls(urls);
  return true;
};

// Plazo informado a la persona que pide eliminar su cuenta.
export const DELETION_DAYS = 5;
