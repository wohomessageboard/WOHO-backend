import pool from '../config/db.js';
import bcryptjs from 'bcryptjs';
import { normalizePhone, PHONE_HELP } from '../utils/phone.js';
import { DELETION_DAYS } from '../services/accounts.js';

export const getMe = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url as avatar, u.bio, u.instagram_handle, u.phone_whatsapp, u.facebook_url,
              u.deletion_requested_at,
              (SELECT due_at FROM deletion_requests d WHERE d.user_id = u.id AND d.status = 'pending') AS deletion_due_at
       FROM users u WHERE u.id = $1`,
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

    // WhatsApp: único dato de contacto. Vacío = no se toca; con valor, debe ser válido.
    let phone = null;
    if (phone_whatsapp && String(phone_whatsapp).trim()) {
      phone = normalizePhone(phone_whatsapp);
      if (!phone) return res.status(400).json({ error: PHONE_HELP });
    }

    const updatedUser = await pool.query(
      `UPDATE users 
       SET name = $1, bio = COALESCE($2, bio), instagram_handle = COALESCE($3, instagram_handle),
           phone_whatsapp = COALESCE($4, phone_whatsapp), facebook_url = COALESCE($5, facebook_url)
       WHERE id = $6 
       RETURNING id, name, email, role, bio, instagram_handle, phone_whatsapp, facebook_url, avatar_url as avatar`,
      [name, bio || null, instagram_handle || null, phone, facebook_url || null, id]
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

// Seguir es idempotente: repetir la acción no crea filas duplicadas. La unicidad la
// garantiza la base (índices de la migración 001), no una consulta previa, así que
// tampoco se duplica si dos peticiones llegan a la vez.
export const addFollowCountry = async (req, res) => {
  try {
    const userId = req.user.id;
    const countryId = Number(req.params.countryId);
    if (!Number.isInteger(countryId)) return res.status(400).json({ error: 'País inválido' });

    const exists = await pool.query('SELECT 1 FROM countries WHERE id = $1', [countryId]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'País no encontrado' });

    await pool.query(
      `INSERT INTO user_follows (user_id, country_id) VALUES ($1, $2)
       ON CONFLICT (user_id, country_id) WHERE city_id IS NULL DO NOTHING`,
      [userId, countryId]
    );

    res.status(201).json({ message: 'País seguido exitosamente' });
  } catch (error) {
    console.error('Error al seguir país:', error);
    res.status(500).json({ error: 'Error al seguir destino' });
  }
};

export const removeFollowCountry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { countryId } = req.params;
    await pool.query('DELETE FROM user_follows WHERE user_id = $1 AND country_id = $2 AND city_id IS NULL', [userId, countryId]);
    res.status(200).json({ message: 'País dejado de seguir' });
  } catch (error) {
    res.status(500).json({ error: 'Error al dejar de seguir' });
  }
};

export const addFollowCity = async (req, res) => {
  try {
    const userId = req.user.id;
    const cityId = Number(req.params.cityId);
    if (!Number.isInteger(cityId)) return res.status(400).json({ error: 'Ciudad inválida' });

    const city = await pool.query('SELECT country_id FROM cities WHERE id = $1', [cityId]);
    if (city.rowCount === 0) return res.status(404).json({ error: 'Ciudad no encontrada' });

    await pool.query(
      `INSERT INTO user_follows (user_id, country_id, city_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, country_id, city_id) DO NOTHING`,
      [userId, city.rows[0].country_id, cityId]
    );

    res.status(201).json({ message: 'Ciudad seguida exitosamente' });
  } catch (error) {
    console.error('Error al seguir ciudad:', error);
    res.status(500).json({ error: 'Error al seguir ciudad' });
  }
};

export const removeFollowCity = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM user_follows WHERE user_id = $1 AND city_id = $2', [userId, req.params.cityId]);
    res.status(200).json({ message: 'Ciudad dejada de seguir' });
  } catch (error) {
    res.status(500).json({ error: 'Error al dejar de seguir la ciudad' });
  }
};

// ---- Eliminar mi cuenta -------------------------------------------------------
// No se borra al instante: se crea una solicitud que el equipo ejecuta dentro del plazo
// (DELETION_DAYS). Mientras tanto los avisos dejan de mostrarse y de recibir contactos.
// Pide la contraseña para confirmar que la solicitud la hace la persona dueña de la cuenta.
export const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Escribe tu contraseña para confirmar.' });

    const user = await pool.query('SELECT name, email, password, role FROM users WHERE id = $1', [userId]);
    if (user.rowCount === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.rows[0].role === 'superadmin') {
      return res.status(403).json({ error: 'Una cuenta superadmin no puede solicitar su eliminación desde aquí.' });
    }
    if (!(await bcryptjs.compare(password, user.rows[0].password))) {
      return res.status(401).json({ error: 'La contraseña no es correcta.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET deletion_requested_at = COALESCE(deletion_requested_at, now()) WHERE id = $1', [userId]);
      await client.query(
        `INSERT INTO deletion_requests (user_id, user_name, user_email, due_at)
         VALUES ($1, $2, $3, now() + make_interval(days => $4))
         ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING`,
        [userId, user.rows[0].name, user.rows[0].email, DELETION_DAYS]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const info = await pool.query("SELECT requested_at, due_at FROM deletion_requests WHERE user_id = $1 AND status = 'pending'", [userId]);
    return res.status(201).json({
      message: `Recibimos tu solicitud. Eliminaremos tu cuenta, tus avisos y tus fotos en un plazo de hasta ${DELETION_DAYS} días.`,
      requested_at: info.rows[0].requested_at,
      due_at: info.rows[0].due_at,
    });
  } catch (error) {
    console.error('Error en requestAccountDeletion:', error);
    return res.status(500).json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' });
  }
};

export const cancelAccountDeletion = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query("UPDATE deletion_requests SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending'", [userId]);
    await pool.query('UPDATE users SET deletion_requested_at = NULL WHERE id = $1', [userId]);
    return res.status(200).json({ message: 'Cancelaste la solicitud. Tu cuenta sigue activa.' });
  } catch (error) {
    console.error('Error en cancelAccountDeletion:', error);
    return res.status(500).json({ error: 'No pudimos cancelar la solicitud.' });
  }
};
