import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import postsRoutes from './routes/posts.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dataRoutes from './routes/data.routes.js';
import contactRoutes from './routes/contact.routes.js';
import shareRoutes from './routes/share.routes.js';

dotenv.config();

const app = express();

// Detrás de un proxy (Render, Vercel...) req.ip debe ser la IP real de la persona.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/share', shareRoutes);
app.use('/api', dataRoutes);

app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Último recurso: responde JSON y nunca expone el stack ni rutas del servidor.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    // Avatar u otra subida sin middleware propio.
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'La imagen es demasiado pesada (máx. 10 MB).' });
    return res.status(400).json({ error: 'No pudimos leer la imagen que enviaste.' });
  }
  console.error('Error no controlado:', err);
  res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Error interno del servidor' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}

export default app;
