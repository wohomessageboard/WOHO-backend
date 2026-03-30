import { Router } from 'express';
import { getMe, updateMe, uploadUserAvatar, addFavorite, removeFavorite, getMyPosts, getFavorites, getFollows, addFollowCountry, removeFollowCountry } from '../controllers/users.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadAvatar } from '../config/cloudinary.js';

const router = Router();

router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);

router.post('/me/avatar', verifyToken, uploadAvatar.single('avatar'), uploadUserAvatar);

router.get('/me/posts', verifyToken, getMyPosts);
router.get('/me/favorites', verifyToken, getFavorites);
router.post('/me/favorites/:postId', verifyToken, addFavorite);
router.delete('/me/favorites/:postId', verifyToken, removeFavorite);

router.get('/me/follows', verifyToken, getFollows);
router.post('/me/follows/countries/:countryId', verifyToken, addFollowCountry);
router.delete('/me/follows/countries/:countryId', verifyToken, removeFollowCountry);

export default router;
