import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const verifyRole = (rolesPermitidos) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ error: 'No se pudo verificar la identidad del usuario' });
    }

    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes los permisos necesarios para realizar esta acción' });
    }

    next();
  };
};
