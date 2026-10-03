import pool from '../config/db.js';

export const verifyPostOwnerOrAdmin = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const postQuery = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);

    if (postQuery.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    const postOwnerId = postQuery.rows[0].user_id;

    if (postOwnerId !== userId && userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'No tienes los permisos para borrar este aviso. Se requiere ser creador o administrador.' });
    }

    next();
  } catch (error) {
    console.error('Error en verifyPostOwnerOrAdmin:', error);
    return res.status(500).json({ error: 'Error del servidor al verificar permisos' });
  }
};

// Editar: solo quien publicó. Los administradores moderan (eliminan) pero no
// reescriben el contenido de otras personas.
export const verifyPostOwner = async (req, res, next) => {
  try {
    const postQuery = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);

    if (postQuery.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    if (postQuery.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo quien publicó el aviso puede editarlo. Los administradores pueden eliminarlo, no editarlo.' });
    }

    next();
  } catch (error) {
    console.error('Error en verifyPostOwner:', error);
    return res.status(500).json({ error: 'Error del servidor al verificar permisos' });
  }
};
