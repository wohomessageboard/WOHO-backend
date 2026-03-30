import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configuramos Cloudinary usando las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Le enseñamos a Cloudinary cómo tratar las fotos del Avatar
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'woho_avatars', // En tu cuenta de Cloudinary, se creará esta carpeta automáticamente
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Achicamos para ahorrar megabytes
  }
});

export const uploadAvatar = multer({ storage });
