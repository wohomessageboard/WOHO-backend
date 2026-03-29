import { Router } from 'express';
import { getPosts, getPostById, createPost, getFeed, deletePost } from '../controllers/posts.controller.js';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
import { uploadMiddleWare } from '../middlewares/upload.middleware.js';
import { verifyPostOwnerOrAdmin } from '../middlewares/post.middleware.js';

const router = Router();

// Públicos
// Públicos
router.get('/', getPosts);

// Feed "Para Ti" (requiere que el usuario esté logueado)
router.get('/feed', verifyToken, getFeed);

router.get('/:id', getPostById);

// Privados
// Para el POST, primero verificamos que tenga un JWT válido,
// luego usamos el middleware de Multer para pre-procesar la data Form-Data e interceptar las imágenes.
router.post('/', verifyToken, uploadMiddleWare, createPost);

// Borrar un Post: Verifica que haya un Token y luego que sea el Propietario o un Admin/Superadmin
router.delete('/:id', verifyToken, verifyPostOwnerOrAdmin, deletePost);

export default router;
