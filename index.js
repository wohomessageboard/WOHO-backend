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

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Permitir solo a nuestra App React oficial
  optionsSuccessStatus: 200 // Compatibilidad para navegadores muy viejos (SmartTVs antiguos)
};

app.use(cors(corsOptions));
app.use(express.json());  // Para parsear el body JSON

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', dataRoutes);

app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}

export default app; // Para poder usarlo en supertest
