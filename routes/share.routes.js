import { Router } from 'express';
import { sharePost } from '../controllers/share.controller.js';
import { numericParams } from '../middlewares/params.middleware.js';

const router = Router();
numericParams(router, 'id');

router.get('/posts/:id', sharePost);

export default router;
