import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadMiddleWare = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {

    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Solo se permiten imágenes (JPG, PNG, WEBP, etc.).'));
    }
  }
}).array('images', 5);
