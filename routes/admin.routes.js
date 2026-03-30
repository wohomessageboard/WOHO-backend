import { Router } from 'express';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();

router.use(verifyToken, verifyRole(['admin', 'superadmin']));

router.get('/users', admin.getUsers);
router.put('/users/:id/role', admin.changeUserRole);
router.put('/users/:id/ban', admin.banUser); // Soft delete permitido para admin y superadmin

router.delete('/users/:id', verifyRole(['superadmin']), admin.deleteUser);

router.post('/countries', admin.createCountry);
router.put('/countries/:id', admin.updateCountry);
router.delete('/countries/:id', admin.deleteCountry);

router.post('/cities', admin.createCity);
router.put('/cities/:id', admin.updateCity);
router.delete('/cities/:id', admin.deleteCity);

router.post('/categories', admin.createCategory);
router.delete('/categories/:id', admin.deleteCategory);

router.get('/posts', admin.getAdminPosts);
router.post('/posts', admin.createAdminPost);

router.put('/posts/:id/pin', verifyRole(['superadmin']), admin.pinPost);
router.delete('/posts/:id', admin.deleteAdminPost);

router.get('/stats', admin.getStats);

export default router;
