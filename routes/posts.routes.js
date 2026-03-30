import { Router } from 'express';
import { getPosts, getPostById, createPost, updatePost, getFeed, deletePost } from '../controllers/posts.controller.js';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
import { uploadMiddleWare } from '../middlewares/upload.middleware.js';
import { verifyPostOwnerOrAdmin } from '../middlewares/post.middleware.js';

const router = Router();

router.get('/', getPosts);

router.get('/feed', verifyToken, getFeed);

router.get('/:id', getPostById);

router.post('/', verifyToken, uploadMiddleWare, createPost);

router.put('/:id', verifyToken, verifyPostOwnerOrAdmin, uploadMiddleWare, updatePost);

router.delete('/:id', verifyToken, verifyPostOwnerOrAdmin, deletePost);

export default router;
