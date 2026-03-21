import { Router } from 'express';
import { getMe, updateMe, addFavorite, removeFavorite } from '../controllers/users.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas estas rutas están protegidas por el JWT middleware
// getMe para obtener la data y updateMe para editar el nombre
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);

// Rutas de favoritos del usuario
router.post('/me/favorites/:postId', verifyToken, addFavorite);
router.delete('/me/favorites/:postId', verifyToken, removeFavorite);

export default router;
