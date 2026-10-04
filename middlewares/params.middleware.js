// Los ids de la URL deben ser enteros positivos. Sin esto, "/api/posts/mine" llegaba a la
// base de datos como texto y terminaba en un error 500 en lugar de un 404 limpio.
const validate = (req, res, next, value) => {
  if (/^\d{1,9}$/.test(value) && Number(value) > 0) return next();
  return res.status(404).json({ error: 'Recurso no encontrado' });
};

export const numericParams = (router, ...names) => {
  names.forEach((name) => router.param(name, validate));
  return router;
};
