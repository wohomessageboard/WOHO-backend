import pool from '../config/db.js';

// Obtener la información del usuario logueado (GET /api/users/me)
export const getMe = async (req, res) => {
  try {
    const { id } = req.user; // Obtenemos el id inyectado en verifyToken

    // Traemos los datos omitiendo la contraseña
    const user = await pool.query(
      'SELECT id, name, email, role, avatar_url as avatar, bio, instagram_handle FROM users WHERE id = $1',
      [id]
    );

    if (user.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(user.rows[0]);
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Actualizar la información del usuario logueado (PUT /api/users/me)
export const updateMe = async (req, res) => {
  try {
    const { id } = req.user;
    const { name, bio, instagram_handle } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Debes enviar al menos el nombre para actualizar' });
    }

    // Actualizamos el registro retornando los nuevos datos
    const updatedUser = await pool.query(
      `UPDATE users 
       SET name = $1, bio = COALESCE($2, bio), instagram_handle = COALESCE($3, instagram_handle) 
       WHERE id = $4 
       RETURNING id, name, email, role, bio, instagram_handle`,
      [name, bio || null, instagram_handle || null, id]
    );

    return res.status(200).json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Error en updateMe:', error);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Agregar un post a favoritos (POST /api/users/me/favorites/:postId)
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Insertamos la relación de forma única para index compuesto
    await pool.query(
      'INSERT INTO favorites (user_id, post_id) VALUES ($1, $2) ON CONFLICT (user_id, post_id) DO NOTHING',
      [userId, postId]
    );

    return res.status(201).json({ message: 'Favorito agregado exitosamente' });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    return res.status(500).json({ error: 'Error del servidor al agregar favorito' });
  }
};

// Obtener mis posts publicados (GET /api/users/me/posts)
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT p.*,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener mis posts:', error);
    return res.status(500).json({ error: 'Error al obtener tus anuncios' });
  }
};

// Obtener mis posts favoritos (GET /api/users/me/favorites)
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT f.post_id, p.*,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name
      FROM favorites f
      JOIN posts p ON f.post_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE f.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    // Simplificar array eliminando columnas redundantes o dejando igual
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return res.status(500).json({ error: 'Error del servidor al cargar favoritos' });
  }
};

// Eliminar un post de favoritos (DELETE /api/users/me/favorites/:postId)
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const deleteResult = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    return res.status(200).json({ message: 'Favorito eliminado exitosamente' });
  } catch (error) {
    console.error('Error al remover favorito:', error);
    return res.status(500).json({ error: 'Error del servidor al eliminar favorito' });
  }
};

// ==========================================
// SEGUIMIENTO DE DESTINOS (User Follows)
// ==========================================

export const getFollows = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT uf.country_id, c.name, c.flag, uf.city_id, ci.name as city_name 
      FROM user_follows uf
      JOIN countries c ON uf.country_id = c.id
      LEFT JOIN cities ci ON uf.city_id = ci.id
      WHERE uf.user_id = $1
    `, [userId]);
    res.json(rows);
  } catch(error) {
    res.status(500).json({error: 'Error obteniendo destinos seguidos'});
  }
};

export const addFollowCountry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { countryId } = req.params;
    
    // Postgres trata NULL != NULL en constraints, así que evaluamos manualmente para evitar dups x país
    const check = await pool.query(
      'SELECT 1 FROM user_follows WHERE user_id=$1 AND country_id=$2 AND city_id IS NULL', 
      [userId, countryId]
    );
    
    if (check.rowCount === 0) {
      await pool.query(
        'INSERT INTO user_follows (user_id, country_id) VALUES ($1, $2)',
        [userId, countryId]
      );
    }
    
    res.status(201).json({ message: 'País seguido exitosamente' });
  } catch(error) { 
    res.status(500).json({error: 'Error al seguir destino'}); 
  }
};

export const removeFollowCountry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { countryId } = req.params;
    await pool.query('DELETE FROM user_follows WHERE user_id = $1 AND country_id = $2 AND city_id IS NULL', [userId, countryId]);
    res.status(200).json({ message: 'País dejado de seguir' });
  } catch(error) { 
    res.status(500).json({error: 'Error al dejar de seguir'}); 
  }
};
