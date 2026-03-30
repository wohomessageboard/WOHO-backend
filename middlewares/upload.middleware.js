import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadMiddleWare = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Aumentamos a 10 MB para dar margen a la compresión en la nube
  },
  fileFilter: (req, file, cb) => {

    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Solo se permiten imágenes (JPG, PNG, WEBP, etc.).'));
    }
  }
}).array('images', 5); // Permitimos hasta 5 fotos por anuncio
