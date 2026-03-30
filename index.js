import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dataRoutes from './routes/data.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE SEGURIDAD CORS PARA PRODUCCIÓN
// ==========================================
// PELIGRO DE CORS ABIERTO (*):
// Si usáramos app.use(cors()) sin opciones, el valor de 'origin' por defecto es '*'.
// Esto significa que CUALQUIER página web en el mundo (incluyendo scripts de dominios maliciosos)
// podría hacer peticiones directas (HTTP Requests) hacia esta API de WOHO, intentar suplantar
// llamadas o hacer ataques tipo Cross-Site Request Forgery (CSRF). 
// Al restringirlo estrictamente a nuestro FRONTEND_URL oficial (el de Vercel/Netlify),
// el navegador del atacante bloqueará la lectura de respuestas para proteger los datos de nuestros usuarios viajeros.
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Permitir solo a nuestra App React oficial
  optionsSuccessStatus: 200 // Compatibilidad para navegadores muy viejos (SmartTVs antiguos)
};

// Middlewares Globales
app.use(cors(corsOptions));
app.use(express.json());  // Para parsear el body JSON

// Registrar las Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', dataRoutes);
// Rutas exclusivas del Panel VIP
app.use('/api/admin', adminRoutes);

// Ruta por defecto con 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Arrancar el Servidor, se evalúa si estamos en entorno de testing para no bloquear el puerto
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}

export default app; // Para poder usarlo en supertest
