import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors());          // Permitir llamadas CORS para conexión entre el Front y el Back
app.use(express.json());  // Para parsear el body JSON

// Registrar las Rutas
// Se separa la lógica en dominios con una base de ruta para la API REST
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);

// Ruta por defecto con 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Arrancar el Servidor, se evalúa si estamos en entorno de testing para no bloquear el puerto
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}

export default app; // Para poder usarlo en supertest
