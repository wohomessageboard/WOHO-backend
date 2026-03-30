import multer from 'multer';

// Usamos almacenamiento en memoria de multer.
// Las imágenes se subirán directamente a Cloudinary desde el buffer en memoria en lugar de guardarse en el disco.
const storage = multer.memoryStorage();

// Configuramos multer para aceptar un máximo de 4 archivos
// Utilizamos 'images' como el nombre del campo del form-data
export const uploadMiddleWare = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Aumentamos a 10 MB para dar margen a la compresión en la nube
  },
  fileFilter: (req, file, cb) => {
    // Convertimos a minúsculas y aceptamos cualquier tipo de imagen común
    const mime = file.mimetype.toLowerCase();
    if (mime.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Solo se permiten imágenes (JPG, PNG, WEBP, etc.).'));
    }
  }
}).array('images', 5); // Permitimos hasta 5 fotos por anuncio
