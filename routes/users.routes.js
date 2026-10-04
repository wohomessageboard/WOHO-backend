import { Router } from 'express';
import { getMe, updateMe, uploadUserAvatar, addFavorite, removeFavorite, getMyPosts, getFavorites, getFollows, addFollowCountry, removeFollowCountry, addFollowCity, removeFollowCity, requestAccountDeletion, cancelAccountDeletion, acceptTerms } from '../controllers/users.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadAvatar } from '../config/cloudinary.js';
import { numericParams } from '../middlewares/params.middleware.js';

const router = Router();
numericParams(router, 'postId', 'countryId', 'cityId');

router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);
router.post('/me/accept-terms', verifyToken, acceptTerms);
router.post('/me/delete-request', verifyToken, requestAccountDeletion);
router.delete('/me/delete-request', verifyToken, cancelAccountDeletion);

router.post('/me/avatar', verifyToken, uploadAvatar.single('avatar'), uploadUserAvatar);

router.get('/me/posts', verifyToken, getMyPosts);
router.get('/me/favorites', verifyToken, getFavorites);
router.post('/me/favorites/:postId', verifyToken, addFavorite);
router.delete('/me/favorites/:postId', verifyToken, removeFavorite);

router.get('/me/follows', verifyToken, getFollows);
router.post('/me/follows/countries/:countryId', verifyToken, addFollowCountry);
router.delete('/me/follows/countries/:countryId', verifyToken, removeFollowCountry);
router.post('/me/follows/cities/:cityId', verifyToken, addFollowCity);
router.delete('/me/follows/cities/:cityId', verifyToken, removeFollowCity);

export default router;
