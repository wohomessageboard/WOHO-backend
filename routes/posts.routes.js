import { Router } from 'express';
import { getPosts, createPost, getFeed, deletePost } from '../controllers/posts.controller.js';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
import { uploadMiddleWare } from '../middlewares/upload.middleware.js';
import { verifyPostOwnerOrAdmin } from '../middlewares/post.middleware.js';

const router = Router();

// Públicos
router.get('/', getPosts);

// Privados
// Para el POST, primero verificamos que tenga un JWT válido,
// luego usamos el middleware de Multer para pre-procesar la data Form-Data e interceptar las imágenes.
router.post('/', verifyToken, uploadMiddleWare, createPost);

// Feed "Para Ti" (requiere que el usuario esté logueado)
router.get('/feed', verifyToken, getFeed);

// Borrar un Post: Verifica que haya un Token y luego que sea el Propietario o un Admin/Superadmin
router.delete('/:id', verifyToken, verifyPostOwnerOrAdmin, deletePost);

export default router;
