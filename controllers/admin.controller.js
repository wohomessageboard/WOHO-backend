import pool from '../config/db.js';

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
    const { role } = req.body; // 'user', 'admin', 'superadmin'

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
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado definitivamente de la base de datos' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

export const createCountry = async (req, res) => {
  try {
    const { name, flag, description, image } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await pool.query(
      'INSERT INTO countries (name, flag, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, flag, description, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creando país. Puede que ya exista.' });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, flag, description, image } = req.body;

    const result = await pool.query(
      'UPDATE countries SET name = COALESCE($1, name), flag = COALESCE($2, flag), description = COALESCE($3, description), image_url = COALESCE($4, image_url) WHERE id = $5 RETURNING *',
      [name, flag, description, image, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'País no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar país' });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM countries WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'País no encontrado' });

    res.json({ message: 'País eliminado con éxito. Los posts asociados ahora tienen null en country_id.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar país' });
  }
};

export const createCity = async (req, res) => {
  try {
    const { name, country_id } = req.body;
    if (!name || !country_id) return res.status(400).json({ error: 'Nombre y country_id son obligatorios' });

    const result = await pool.query('INSERT INTO cities (name, country_id) VALUES ($1, $2) RETURNING *', [name, country_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la ciudad' });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' });

    const result = await pool.query('UPDATE cities SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ciudad no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la ciudad' });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cities WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ciudad no encontrada' });

    res.json({ message: 'Ciudad eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ciudad' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' });

    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la categoría. Pudo haber conflicto de nombre único.' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
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
    const result = await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Aviso no encontrado' });

    res.json({ message: 'Aviso eliminado mediante Moderación Administrativa' });
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
