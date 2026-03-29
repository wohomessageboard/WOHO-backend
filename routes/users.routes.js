import { Router } from 'express';
import { getMe, updateMe, addFavorite, removeFavorite, getMyPosts, getFavorites, getFollows, addFollowCountry, removeFollowCountry } from '../controllers/users.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas estas rutas están protegidas por el JWT middleware
// getMe para obtener la data y updateMe para editar el nombre
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);

// Rutas de los posts y favoritos del usuario
router.get('/me/posts', verifyToken, getMyPosts);
router.get('/me/favorites', verifyToken, getFavorites);
router.post('/me/favorites/:postId', verifyToken, addFavorite);
router.delete('/me/favorites/:postId', verifyToken, removeFavorite);

// Seguimiento de Países
router.get('/me/follows', verifyToken, getFollows);
router.post('/me/follows/countries/:countryId', verifyToken, addFollowCountry);
router.delete('/me/follows/countries/:countryId', verifyToken, removeFollowCountry);

export default router;
