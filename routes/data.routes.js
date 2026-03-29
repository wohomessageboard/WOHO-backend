import { Router } from 'express';
import { getCountries, getCities, getCategories, getCountryByName } from '../controllers/data.controller.js';

const router = Router();

router.get('/countries', getCountries);
router.get('/countries/:name', getCountryByName);
router.get('/cities', getCities);
router.get('/categories', getCategories);

export default router;
