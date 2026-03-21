import pool from '../config/db.js';

// Obtener la información del usuario logueado (GET /api/users/me)
export const getMe = async (req, res) => {
  try {
    const { id } = req.user; // Obtenemos el id inyectado en verifyToken

    // Traemos los datos omitiendo la contraseña
    const user = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Debes enviar al menos el nombre para actualizar' });
    }

    // Actualizamos el registro retornando los nuevos datos
    const updatedUser = await pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role',
      [name, id]
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

    // Insertamos la relación de forma única (maneja conflicto de PK en postgres si existiera)
    await pool.query(
      'INSERT INTO favorites (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, postId]
    );

    return res.status(201).json({ message: 'Favorito agregado exitosamente' });
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    return res.status(500).json({ error: 'Error del servidor al agregar favorito' });
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
