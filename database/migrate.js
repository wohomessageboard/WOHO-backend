// Corre las migraciones de database/migrations/*.sql en orden, una sola vez cada
// una (se registran en la tabla schema_migrations). Uso:  npm run migrate
// Cada archivo corre dentro de una transacción: si falla, no deja nada a medias.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`→ Aplicando ${file}…`);
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✖ ${file} falló y se revirtió: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(applied ? `✔ ${applied} migración(es) aplicada(s).` : '✔ Base de datos al día.');
  } finally {
    client.release();
    await pool.end();
  }
};

run();
