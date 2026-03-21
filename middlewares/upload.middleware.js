import multer from 'multer';

// Usamos almacenamiento en memoria de multer.
// Las imágenes se subirán directamente a Cloudinary desde el buffer en memoria en lugar de guardarse en el disco.
const storage = multer.memoryStorage();

// Configuramos multer para aceptar un máximo de 4 archivos
// Utilizamos 'images' como el nombre del campo del form-data
export const uploadMiddleWare = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB límite por archivo
  },
  fileFilter: (req, file, cb) => {
    // Verificamos el mimetype de la imagen para permitir solo algunos tipos
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado, solo se aceptan imágenes.'), false);
    }
  }
}).array('images', 4); // Limita hasta 4 imágenes llamadas 'images'
