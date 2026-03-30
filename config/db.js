import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Si existe DATABASE_URL (entorno de Render/Supabase), usamos esa cadena y activamos SSL
// porque las bases de datos en la nube no te dejan entrar puramente por IP sin encriptación.
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      allowExitOnIdle: true
    };

const pool = new Pool(poolConfig);

// Comprobamos la conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error conectando a la base de datos', err);
  } else {
    console.log('✅ Base de datos conectada exitosamente');
  }
});

export default pool;
