import multer from 'multer';

const storage = multer.memoryStorage();

const MAX_FILE_MB = 10;
const MAX_FILES = 5;

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {

    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Formato no soportado. Solo se permiten imágenes (JPG, PNG, WEBP, etc.).'), { status: 400 }));
    }
  }
}).array('images', MAX_FILES);

// Traduce los errores de multer a respuestas JSON claras (antes salían como 500
// con una página HTML que incluía la ruta del servidor).
export const uploadMiddleWare = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `Cada foto debe pesar menos de ${MAX_FILE_MB} MB.` });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: `Puedes subir como máximo ${MAX_FILES} fotos.` });
      }
      return res.status(400).json({ error: 'No pudimos leer las fotos que enviaste.' });
    }
    if (err.status === 400) return res.status(400).json({ error: err.message });
    return next(err);
  });
};
