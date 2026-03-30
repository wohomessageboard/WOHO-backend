// ============================================================
// CONFIGURACIÓN DE CLOUDINARY + MULTER (Subida de Imágenes)
// ============================================================
// Este archivo configura DOS cosas:
// 1. Cloudinary: El servicio en la nube donde se almacenan las fotos de avatar.
// 2. Multer: El middleware de Express que intercepta archivos del formulario
//    antes de que lleguen al controlador.
//
// ¿POR QUÉ NO USAMOS multer-storage-cloudinary?
// Porque esa librería (v4) exige cloudinary v1, pero nosotros usamos cloudinary v2.
// La incompatibilidad causa fallos silenciosos en producción (Render).
// La estrategia es: Multer guarda en MEMORIA (RAM) → nosotros subimos a Cloudinary manualmente.
// ============================================================

import { v2 as cloudinary } from 'cloudinary';  // SDK oficial de Cloudinary versión 2
import multer from 'multer';                     // Middleware para procesar archivos multipart/form-data
import dotenv from 'dotenv';                     // Para leer variables de entorno del archivo .env

dotenv.config();

// 1. CONFIGURACIÓN DE CLOUDINARY
// Estas 3 credenciales vienen de tu Dashboard en https://cloudinary.com/console
// Se guardan como variables de entorno en Render (.env en local).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  // Ej: "dxyz123abc"
  api_key: process.env.CLOUDINARY_API_KEY,         // Ej: "123456789012345"
  api_secret: process.env.CLOUDINARY_API_SECRET    // Ej: "abcDefGhiJklMnoPqrStuVwx"
});

// 2. CONFIGURACIÓN DE MULTER (Almacenamiento en Memoria)
// En vez de guardar la imagen en disco, la guardamos en RAM como un Buffer.
// Esto es más rápido y no necesita permisos de escritura en el servidor.
const storage = multer.memoryStorage();

// Exportamos multer configurado con límites y filtros de seguridad.
// Se usa como middleware en la ruta: router.post('/me/avatar', uploadAvatar.single('avatar'), controlador)
export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5 MB (5 * 1024 KB * 1024 bytes)
  fileFilter: (req, file, cb) => {
    // Solo permitimos estos formatos de imagen
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);   // cb = callback. null = sin error, true = aceptar archivo
    } else {
      cb(new Error('Formato no permitido. Solo JPG, PNG o WEBP.'));  // Rechazar el archivo
    }
  }
});

// 3. FUNCIÓN AUXILIAR: Subir el Buffer a Cloudinary
// Usa "upload_stream" que acepta un flujo de bytes en vez de una ruta de archivo.
// Retorna una Promesa porque upload_stream es asíncrono con callbacks.
export const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    // cloudinary.uploader.upload_stream devuelve un "stream" (tubería de datos).
    // Le pasamos opciones de configuración y un callback que se ejecuta al terminar.
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'woho_avatars',  // Carpeta en Cloudinary donde se guardan los avatars
        transformation: [{ width: 500, height: 500, crop: 'limit' }]  // Redimensionar para ahorrar espacio
      },
      (error, result) => {
        // Este callback se ejecuta cuando Cloudinary termina de procesar la imagen
        if (error) reject(error);   // Si hubo error, rechazamos la Promesa
        else resolve(result);       // Si todo OK, result.secure_url tiene la URL pública de la imagen
      }
    );
    // Enviamos el buffer (los bytes de la imagen) por la tubería y cerramos el stream
    stream.end(buffer);
  });
};
