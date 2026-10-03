import { Router } from 'express';
import { getPosts, getPostById, createPost, updatePost, getFeed, deletePost, reportPost } from '../controllers/posts.controller.js';
import { verifyToken, optionalAuth } from '../middlewares/auth.middleware.js';
import { uploadMiddleWare } from '../middlewares/upload.middleware.js';
import { verifyPostOwnerOrAdmin, verifyPostOwner } from '../middlewares/post.middleware.js';

const router = Router();

router.get('/', optionalAuth, getPosts);

router.get('/feed', verifyToken, getFeed);

router.get('/:id', optionalAuth, getPostById);

router.post('/', verifyToken, uploadMiddleWare, createPost);

// Editar: solo quien publicó. Eliminar: quien publicó o un administrador.
router.put('/:id', verifyToken, verifyPostOwner, uploadMiddleWare, updatePost);

router.delete('/:id', verifyToken, verifyPostOwnerOrAdmin, deletePost);

router.post('/:id/report', verifyToken, reportPost);

export default router;
