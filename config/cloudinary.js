

import { v2 as cloudinary } from 'cloudinary';  // SDK oficial de Cloudinary versión 2
import multer from 'multer';                     // Middleware para procesar archivos multipart/form-data
import dotenv from 'dotenv';                     // Para leer variables de entorno del archivo .env

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  // Ej: "dxyz123abc"
  api_key: process.env.CLOUDINARY_API_KEY,         // Ej: "123456789012345"
  api_secret: process.env.CLOUDINARY_API_SECRET    // Ej: "abcDefGhiJklMnoPqrStuVwx"
});

const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Aumentamos a 10MB para que el servidor reciba, luego comprimimos
  fileFilter: (req, file, cb) => {

    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo imágenes (JPG, PNG, WEBP, etc.).'));
    }
  }
});

export const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'woho_avatars',  // Carpeta en Cloudinary donde se guardan los avatars
        transformation: [
          { width: 500, height: 500, crop: 'limit', quality: 'auto' }, // Redimensionar y comprimir
          { fetch_format: 'auto' } // Formato óptimo (WebP)
        ]
      },
      (error, result) => {

        if (error) reject(error);   // Si hubo error, rechazamos la Promesa
        else resolve(result);       // Si todo OK, result.secure_url tiene la URL pública de la imagen
      }
    );

    stream.end(buffer);
  });
};
