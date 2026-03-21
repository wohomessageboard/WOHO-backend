import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

// Endpoint para el registro de nuevos usuarios
router.post('/register', register);

// Endpoint para el inicio de sesión
router.post('/login', login);

export default router;
