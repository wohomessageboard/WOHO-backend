import pool from '../config/db.js';

export const verifyPostOwnerOrAdmin = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Buscar el post
    const postQuery = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);

    if (postQuery.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    const postOwnerId = postQuery.rows[0].user_id;

    // Verificamos si es dueño O si tiene rol de admin / superadmin
    if (postOwnerId !== userId && userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'No tienes los permisos para borrar este aviso. Se requiere ser creador o administrador.' });
    }

    // Si pasa la validación, continuamos
    next();
  } catch (error) {
    console.error('Error en verifyPostOwnerOrAdmin:', error);
    return res.status(500).json({ error: 'Error del servidor al verificar permisos' });
  }
};
