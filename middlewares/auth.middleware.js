import jwt from 'jsonwebtoken';

// Middleware para verificar el Token JWT
export const verifyToken = (req, res, next) => {
  try {
    // Obtenemos el token desde los headers
    const authHeader = req.headers.authorization;
    
    // Validamos que el header exista y tenga el formato 'Bearer token'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.split(' ')[1];

    // Verificamos el token con la firma secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Guardamos la información del token decodificada (email, id, role) en request
    req.user = decoded;
    
    // Continuamos a la siguiente función
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar si el usuario tiene rol autorizado
export const verifyRole = (rolesPermitidos) => {
  return (req, res, next) => {
    // Si no hay información de usuario, es que verifyToken no se ejecutó previamente
    if (!req.user) {
      return res.status(401).json({ error: 'No se pudo verificar la identidad del usuario' });
    }

    // Comprobamos si el rol del usuario está dentro de los permitidos (ej: ['admin', 'superadmin'])
    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes los permisos necesarios para realizar esta acción' });
    }

    // El rol es válido, continuamos
    next();
  };
};
