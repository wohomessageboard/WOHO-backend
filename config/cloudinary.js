

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {

    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Formato no permitido. Solo imágenes (JPG, PNG, WEBP, etc.).'), { status: 400 }));
    }
  }
});

export const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'woho_avatars',
        transformation: [
          { width: 500, height: 500, crop: 'limit', quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {

        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
};

// ---- Limpieza de imágenes ---------------------------------------------------
// Convierte una URL de Cloudinary en su public_id:
//   https://res.cloudinary.com/<nube>/image/upload/v123/woho_posts/abc.jpg -> woho_posts/abc
export const publicIdFromUrl = (url) => {
  if (typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?((?:woho_posts|woho_avatars)\/[^/.]+)\.[a-z0-9]+(?:$|\?)/i);
  return match ? match[1] : null;
};

// Acepta el valor de la columna images (array, JSON string o null) y devuelve las URLs.
export const imageUrlsFrom = (images) => {
  if (!images) return [];
  try {
    const list = typeof images === 'string' ? JSON.parse(images) : images;
    return Array.isArray(list) ? list.filter((u) => typeof u === 'string') : [];
  } catch {
    return [];
  }
};

// Borra de Cloudinary las imágenes que pertenecen a Driftler (carpetas woho_posts y
// woho_avatars; nunca toca otras). Es "mejor esfuerzo": si Cloudinary falla se
// registra el error pero no se interrumpe la operación del usuario.
export const destroyImagesByUrls = async (urls = []) => {
  const ids = [...new Set(urls.map(publicIdFromUrl).filter(Boolean))];
  if (ids.length === 0) return { deleted: 0 };
  try {
    await cloudinary.api.delete_resources(ids, { resource_type: 'image' });
    return { deleted: ids.length };
  } catch (error) {
    console.error('No se pudieron borrar imágenes de Cloudinary:', error?.error?.message || error?.message || error);
    return { deleted: 0, error: true };
  }
};
