import pool from '../config/db.js';
import { destroyImagesByUrls, imageUrlsFrom } from '../config/cloudinary.js';
import { removeUserAccount } from '../services/accounts.js';

// Nombres de catálogo: sin espacios sobrantes ni dobles, y únicos sin importar mayúsculas.
const cleanName = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// Responde 409 si ya existe otro registro con ese nombre. `scope` agrega una condición
// extra (por ejemplo, las ciudades solo se comparan dentro del mismo país).
const duplicateName = async (table, name, { excludeId = null, scopeSql = '', scopeValues = [] } = {}) => {
  const values = [name.toLowerCase(), ...scopeValues];
  let sql = `SELECT id FROM ${table} WHERE lower(btrim(name)) = $1 ${scopeSql}`;
  if (excludeId) {
    values.push(excludeId);
    sql += ` AND id <> $${values.length}`;
  }
  return (await pool.query(sql, values)).rowCount > 0;
};

const isUniqueViolation = (error) => error?.code === '23505';

export const getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at, role, is_active FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role', [role, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar rol del usuario' });
  }
};

export const banUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ message: result.rows[0].is_active ? 'Usuario desbaneado' : 'Usuario baneado', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al banear usuario' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Borra la cuenta, sus avisos y sus fotos de Cloudinary.
    if (!(await removeUserAccount(id))) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado definitivamente de la base de datos' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

export const createCountry = async (req, res) => {
  try {
    const { flag, description, image } = req.body;
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    if (await duplicateName('countries', name)) {
      return res.status(409).json({ error: `Ya existe un país llamado "${name}".` });
    }

    const result = await pool.query(
      'INSERT INTO countries (name, flag, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, flag, description, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Ya existe un país con ese nombre.' });
    console.error('Error creando país:', error);
    res.status(500).json({ error: 'Error creando país.' });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag, description, image } = req.body;
    const name = req.body.name === undefined ? undefined : cleanName(req.body.name);

    if (name !== undefined && !name) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
    if (name && await duplicateName('countries', name, { excludeId: id })) {
      return res.status(409).json({ error: `Ya existe un país llamado "${name}".` });
    }

    const result = await pool.query(
      'UPDATE countries SET name = COALESCE($1, name), flag = COALESCE($2, flag), description = COALESCE($3, description), image_url = COALESCE($4, image_url) WHERE id = $5 RETURNING *',
      [name, flag, description, image, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'País no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Ya existe un país con ese nombre.' });
    res.status(500).json({ error: 'Error al actualizar país' });
  }
};

export const deleteCountry = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // 1. Ponemos en NULL el country_id de los posts asociados
    await client.query('UPDATE posts SET country_id = NULL, city_id = NULL WHERE country_id = $1', [id]);

    // 2. Borramos las ciudades asociadas a este país
    await client.query('DELETE FROM cities WHERE country_id = $1', [id]);

    // 3. Borramos el país
    const result = await client.query('DELETE FROM countries WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'País no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'País y sus dependencias eliminadas con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar país:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar país' });
  } finally {
    client.release();
  }
};

export const createCity = async (req, res) => {
  try {
    const { country_id } = req.body;
    const name = cleanName(req.body.name);
    if (!name || !country_id) return res.status(400).json({ error: 'Nombre y country_id son obligatorios' });

    if (await duplicateName('cities', name, { scopeSql: 'AND country_id = $2', scopeValues: [country_id] })) {
      return res.status(409).json({ error: `Ya existe la ciudad "${name}" en ese país.` });
    }

    const result = await pool.query('INSERT INTO cities (name, country_id) VALUES ($1, $2) RETURNING *', [name, country_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Ya existe esa ciudad en ese país.' });
    console.error('Error al crear la ciudad:', error);
    res.status(500).json({ error: 'Error al crear la ciudad' });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' });

    const current = await pool.query('SELECT country_id FROM cities WHERE id = $1', [id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Ciudad no encontrada' });

    if (await duplicateName('cities', name, { excludeId: id, scopeSql: 'AND country_id = $2', scopeValues: [current.rows[0].country_id] })) {
      return res.status(409).json({ error: `Ya existe la ciudad "${name}" en ese país.` });
    }

    const result = await pool.query('UPDATE cities SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    res.json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Ya existe esa ciudad en ese país.' });
    res.status(500).json({ error: 'Error al actualizar la ciudad' });
  }
};

export const deleteCity = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // 1. Ponemos en NULL el city_id de los posts asociados
    await client.query('UPDATE posts SET city_id = NULL WHERE city_id = $1', [id]);

    // 2. Borramos la ciudad
    const result = await client.query('DELETE FROM cities WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ciudad no encontrada' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Ciudad eliminada correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar ciudad:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar ciudad' });
  } finally {
    client.release();
  }
};

export const createCategory = async (req, res) => {
  try {
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' });

    if (await duplicateName('categories', name)) {
      return res.status(409).json({ error: `Ya existe una categoría llamada "${name}".` });
    }

    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Ya existe una categoría con ese nombre.' });
    console.error('Error al crear la categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría.' });
  }
};

export const deleteCategory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // 1. Ponemos en NULL el category_id de los posts asociados
    await client.query('UPDATE posts SET category_id = NULL WHERE category_id = $1', [id]);

    // 2. Borramos la categoría
    const result = await client.query('DELETE FROM categories WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Categoría eliminada con éxito' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar categoría' });
  } finally {
    client.release();
  }
};

export const getAdminPosts = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.title, p.is_pinned, p.expires_at, p.created_at, u.name as author_name, u.is_active as author_active 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando posts para panel de admin' });
  }
};

export const createAdminPost = async (req, res) => {
  try {
    const { title, description, country_id, city_id, category_id, images } = req.body;
    const user_id = req.user.id;

    if (!title || !description) return res.status(400).json({ error: 'Título y descripción obligatorios' });

    const result = await pool.query(
      `INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id, is_pinned)
       VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [title, description, images ? JSON.stringify(images) : null, user_id, country_id || null, city_id || null, category_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creando anuncio permanente' });
  }
};

export const pinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE posts SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING id, is_pinned', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Aviso no encontrado' });

    res.json({ message: result.rows[0].is_pinned ? 'Post fijado en portada' : 'Post desfijado', is_pinned: result.rows[0].is_pinned });
  } catch (error) {
    res.status(500).json({ error: 'Error al pinear el post' });
  }
};

export const deleteAdminPost = async (req, res) => {
  try {
    const { id } = req.params;

    const found = await pool.query('SELECT images FROM posts WHERE id = $1', [id]);
    if (found.rowCount === 0) return res.status(404).json({ error: 'Aviso no encontrado' });

    await pool.query(
      `UPDATE inbox_messages SET status = 'resolved', resolution = 'post_deleted', resolved_by = $2, resolved_at = now()
       WHERE post_id = $1 AND status = 'open'`,
      [id, req.user.id]
    );
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    await destroyImagesByUrls(imageUrlsFrom(found.rows[0].images));

    res.json({ message: 'Aviso eliminado mediante Moderación Administrativa, con sus fotos' });
  } catch (error) {
    res.status(500).json({ error: 'Error en la moderación del aviso' });
  }
};

export const getStats = async (req, res) => {
  try {

    const usersCount = pool.query('SELECT COUNT(*) FROM users');
    const countriesCount = pool.query('SELECT COUNT(*) FROM countries');
    const activePostsCount = pool.query('SELECT COUNT(*) FROM posts WHERE expires_at >= CURRENT_DATE OR expires_at IS NULL');
    const topCountry = pool.query(`
      SELECT c.name, COUNT(p.id) as total_posts 
      FROM countries c
      LEFT JOIN posts p ON c.id = p.country_id
      GROUP BY c.id
      ORDER BY total_posts DESC LIMIT 1
    `);

    const [uRes, cRes, pRes, tRes] = await Promise.all([usersCount, countriesCount, activePostsCount, topCountry]);

    res.json({
      total_users: parseInt(uRes.rows[0].count),
      total_countries: parseInt(cRes.rows[0].count),
      active_posts: parseInt(pRes.rows[0].count),
      top_country: tRes.rows.length > 0 ? tRes.rows[0].name : 'N/A'
    });
  } catch (error) {
    console.error('Error stats:', error);
    res.status(500).json({ error: 'Error al generar métricas' });
  }
};

// ---- Bandeja: reportes y mensajes de contacto ------------------------------
export const getInbox = async (req, res) => {
  try {
    const { status = 'open', kind } = req.query;
    const where = [];
    const values = [];
    if (['open', 'resolved'].includes(status)) { values.push(status); where.push(`status = $${values.length}`); }
    if (['report', 'contact'].includes(kind)) { values.push(kind); where.push(`kind = $${values.length}`); }

    const result = await pool.query(
      `SELECT id, kind, status, post_id, post_title, user_id, name, email, reason, message, resolution, resolved_at, created_at
       FROM inbox_messages
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC
       LIMIT 200`,
      values
    );
    const open = await pool.query("SELECT COUNT(*)::int AS n FROM inbox_messages WHERE status = 'open'");
    res.json({ items: result.rows, open_count: open.rows[0].n });
  } catch (error) {
    console.error('Error en getInbox:', error);
    res.status(500).json({ error: 'Error al cargar la bandeja' });
  }
};

export const resolveInboxMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const resolution = ['dismissed', 'replied', 'handled'].includes(req.body.resolution) ? req.body.resolution : 'handled';

    const result = await pool.query(
      `UPDATE inbox_messages SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = now()
       WHERE id = $3 RETURNING id, status, resolution`,
      [resolution, req.user.id, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el mensaje' });
  }
};

// ---- Solicitudes de eliminación de cuenta -----------------------------------
export const getDeletionRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const values = [];
    let where = '';
    if (['pending', 'completed', 'cancelled'].includes(status)) { values.push(status); where = 'WHERE status = $1'; }

    const result = await pool.query(
      `SELECT id, user_id, user_name, user_email, status, requested_at, due_at, completed_at
       FROM deletion_requests ${where}
       ORDER BY (status = 'pending') DESC, due_at ASC
       LIMIT 200`,
      values
    );
    const pending = await pool.query("SELECT COUNT(*)::int AS n FROM deletion_requests WHERE status = 'pending'");
    res.json({ items: result.rows, pending_count: pending.rows[0].n });
  } catch (error) {
    console.error('Error en getDeletionRequests:', error);
    res.status(500).json({ error: 'Error al cargar las solicitudes' });
  }
};

// Ejecuta la eliminación: borra la cuenta (avisos y fotos incluidos) y deja la solicitud
// como constancia SIN datos personales (nombre y correo se borran).
export const executeDeletionRequest = async (req, res) => {
  try {
    const request = await pool.query("SELECT id, user_id FROM deletion_requests WHERE id = $1 AND status = 'pending'", [req.params.id]);
    if (request.rowCount === 0) return res.status(404).json({ error: 'Solicitud no encontrada o ya resuelta' });

    const { id, user_id } = request.rows[0];

    const target = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    if (target.rows[0]?.role === 'superadmin') {
      return res.status(403).json({ error: 'Una cuenta superadmin no se elimina desde aquí.' });
    }
    if (user_id === req.user.id) {
      return res.status(400).json({ error: 'No puedes ejecutar la eliminación de tu propia cuenta desde el panel.' });
    }

    await removeUserAccount(user_id);

    await pool.query(
      `UPDATE deletion_requests SET status = 'completed', completed_at = now(), completed_by = $2, user_name = NULL, user_email = NULL
       WHERE id = $1`,
      [id, req.user.id]
    );
    res.json({ message: 'Cuenta eliminada con sus avisos y fotos.' });
  } catch (error) {
    console.error('Error en executeDeletionRequest:', error);
    res.status(500).json({ error: 'No se pudo eliminar la cuenta' });
  }
};
