import { Router } from 'express';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();

// Middleware de seguridad de doble capa (Primero JWT, luego confirmación de Rol VIP).
// En vez de ponerlo uno por uno, lo amarramos a la ruta base de este archivo
router.use(verifyToken, verifyRole(['admin', 'superadmin']));

// RUTAS USUARIOS
router.get('/users', admin.getUsers);
router.put('/users/:id/role', admin.changeUserRole);
router.put('/users/:id/ban', admin.banUser); // Soft delete permitido para admin y superadmin
// Hard delete restringido solo a superadmin
router.delete('/users/:id', verifyRole(['superadmin']), admin.deleteUser);

// RUTAS PAÍSES
router.post('/countries', admin.createCountry);
router.put('/countries/:id', admin.updateCountry);
router.delete('/countries/:id', admin.deleteCountry);

// RUTAS CIUDADES
router.post('/cities', admin.createCity);
router.put('/cities/:id', admin.updateCity);
router.delete('/cities/:id', admin.deleteCity);

// RUTAS CATEGORÍAS
router.post('/categories', admin.createCategory);
router.delete('/categories/:id', admin.deleteCategory);

// RUTAS MODERACIÓN
router.get('/posts', admin.getAdminPosts);
router.post('/posts', admin.createAdminPost);
// Fijar posts restringido solo a superadmin
router.put('/posts/:id/pin', verifyRole(['superadmin']), admin.pinPost);
router.delete('/posts/:id', admin.deleteAdminPost);

// RUTAS ESTADÍSTICAS
router.get('/stats', admin.getStats);

export default router;
