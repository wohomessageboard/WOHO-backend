// Convierte una cuenta existente en administradora. Primero regístrate en el sitio con
// ese correo y luego corre:   npm run make-admin -- tu@correo.com
import pool from '../config/db.js';

const email = (process.argv[2] || '').trim().toLowerCase();

const run = async () => {
  if (!email) {
    console.error('Uso: npm run make-admin -- correo@ejemplo.com');
    process.exitCode = 1;
    return;
  }
  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET role = 'admin' WHERE lower(email) = $1",
      [email]
    );
    if (rowCount) console.log(`✔ ${email} ahora es admin. Cierra sesión y vuelve a entrar para verlo.`);
    else {
      console.error(`✖ No existe ninguna cuenta con ${email}. Regístrala primero en el sitio.`);
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
};

run();
