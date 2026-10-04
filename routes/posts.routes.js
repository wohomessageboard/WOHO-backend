import { Router } from 'express';
import { getPosts, getPostById, createPost, updatePost, getFeed, deletePost, reportPost, contactPost } from '../controllers/posts.controller.js';
import { verifyToken, optionalAuth } from '../middlewares/auth.middleware.js';
import { uploadMiddleWare } from '../middlewares/upload.middleware.js';
import { verifyPostOwnerOrAdmin, verifyPostOwner } from '../middlewares/post.middleware.js';
import { writeLimiter } from '../middlewares/rateLimit.middleware.js';
import { numericParams } from '../middlewares/params.middleware.js';

const router = Router();
numericParams(router, 'id');

router.get('/', optionalAuth, getPosts);

router.get('/feed', verifyToken, getFeed);

router.get('/:id', optionalAuth, getPostById);

router.post('/', verifyToken, writeLimiter, uploadMiddleWare, createPost);

// Editar: solo quien publicó. Eliminar: quien publicó o un administrador.
router.put('/:id', verifyToken, verifyPostOwner, uploadMiddleWare, updatePost);

router.delete('/:id', verifyToken, verifyPostOwnerOrAdmin, deletePost);

router.post('/:id/report', verifyToken, writeLimiter, reportPost);
router.post('/:id/contact', verifyToken, writeLimiter, contactPost);

export default router;
