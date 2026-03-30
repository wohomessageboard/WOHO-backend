import pool from '../config/db.js';

export const getMe = async (req, res) => {
  try {
    const { id } = req.user; // Obtenemos el id inyectado en verifyToken

    const user = await pool.query(
      'SELECT id, name, email, role, avatar_url as avatar, bio, instagram_handle, phone_whatsapp, facebook_url FROM users WHERE id = $1',
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

export const updateMe = async (req, res) => {
  try {
    const { id } = req.user;
    const { name, bio, instagram_handle, phone_whatsapp, facebook_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Debes enviar al menos el nombre para actualizar' });
    }

    const updatedUser = await pool.query(
      `UPDATE users 
       SET name = $1, bio = COALESCE($2, bio), instagram_handle = COALESCE($3, instagram_handle),
           phone_whatsapp = COALESCE($4, phone_whatsapp), facebook_url = COALESCE($5, facebook_url)
       WHERE id = $6 
       RETURNING id, name, email, role, bio, instagram_handle, phone_whatsapp, facebook_url, avatar_url as avatar`,
      [name, bio || null, instagram_handle || null, phone_whatsapp || null, facebook_url || null, id]
    );

    return res.status(200).json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Error en updateMe:', error);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No se recibió ningún archivo. Verifica que el campo se llame "avatar" y que esté llegando al servidor.' 
      });
    }
    if (!req.file.buffer) {
      return res.status(400).json({ 
        error: 'El archivo llegó pero sin contenido (buffer vacío). Posible fallo de Multer.' 
      });
    }

    const { uploadToCloudinary } = await import('../config/cloudinary.js');
    const result = await uploadToCloudinary(req.file.buffer);
    const secureUrl = result.secure_url;

    const { rows } = await pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url as avatar`,
      [secureUrl, userId]
    );

    return res.status(200).json({ 
      message: 'Avatar actualizado con éxito', 
      avatar: rows[0].avatar 
    });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    if (error.message && error.message.includes('Formato')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: `Error al subir avatar: ${error.message || 'Error desconocido de Cloudinary'}` });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

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

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return res.status(500).json({ error: 'Error del servidor al cargar favoritos' });
  }
};

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
