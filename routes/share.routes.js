import { Router } from 'express';
import { sharePost } from '../controllers/share.controller.js';

const router = Router();

router.get('/posts/:id', sharePost);

export default router;
