import request from 'supertest';
import app from '../index.js';
import pool from '../config/db.js';
import { publicIdFromUrl, imageUrlsFrom } from '../config/cloudinary.js';
import { normalizePhone } from '../utils/phone.js';

describe('🚀 Tests de API REST WOHO', () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM users WHERE email = 'testuser123@woho.com'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = 'testuser123@woho.com'");
    await pool.end();
  });

  let userToken = '';

  it('1. Registro devuelve un 201 y la data del usuario creado', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'testuser123@woho.com',
      password: 'password_test',
      accepted_terms: true,
      confirmed_age: true,
      phone_whatsapp: '+56 9 1234 5678'
    });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('email', 'testuser123@woho.com');
  });

  it('2. Login devuelve un 200 y el token JWT', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'testuser123@woho.com',
      password: 'password_test'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    
    userToken = response.body.token;
  });

  it('3. GET a /api/posts devuelve un código 200 y una lista (Array)', async () => {
    const response = await request(app).get('/api/posts');

    expect(response.statusCode).toBe(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
  it('4. GET a Ruta Protegida (/api/users/me) sin token devuelve un 401', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/Token no proporcionado/i);
  });

  it('5. DELETE a /api/posts/:id con token de usuario común sobre un post que no existe o no es suyo devuelve 404/403', async () => {
    const response = await request(app)
      .delete('/api/posts/99999')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect([404, 403]).toContain(response.statusCode);
  });

  it('6. El correo se trata como uno solo sin importar mayúsculas ni espacios', async () => {
    const dup = await request(app).post('/api/auth/register').send({
      name: 'Otro Test',
      email: '  TESTUSER123@Woho.com ',
      password: 'password_test',
    });
    expect(dup.statusCode).toBe(400);

    const login = await request(app).post('/api/auth/login').send({
      email: 'TestUser123@WOHO.com',
      password: 'password_test',
    });
    expect(login.statusCode).toBe(200);
  });

  it('7. Sin sesión, el detalle de un aviso no entrega correo ni teléfono', async () => {
    const list = await request(app).get('/api/posts');
    if (list.body.length === 0) return;
    const detail = await request(app).get(`/api/posts/${list.body[0].id}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.author_email).toBeUndefined();
    expect(detail.body.author_phone).toBeUndefined();
    expect(detail.body.owner.email).toBeUndefined();
  });

  it('8. Reportar exige sesión; el formulario de contacto valida sus campos', async () => {
    const noAuth = await request(app).post('/api/posts/1/report').send({ reason: 'spam' });
    expect(noAuth.statusCode).toBe(401);

    const bad = await request(app).post('/api/contact').send({ name: '', email: 'x', message: 'corto' });
    expect(bad.statusCode).toBe(400);
  });

  it('9. Subir fotos: errores claros en JSON, sin exponer el servidor', async () => {
    const tooMany = request(app).post('/api/posts').set('Authorization', `Bearer ${userToken}`)
      .field('title', 't').field('description', 'd').field('duration_days', '3').field('category_id', '1');
    for (let i = 0; i < 6; i++) tooMany.attach('images', Buffer.from('x'), { filename: `f${i}.jpg`, contentType: 'image/jpeg' });
    const res = await tooMany;
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/5 fotos/);
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at .*\.js/);
  });

  it('10. Limpieza de Cloudinary: solo reconoce imágenes de WOHO', () => {
    expect(publicIdFromUrl('https://res.cloudinary.com/x/image/upload/v1712/woho_posts/abc.jpg')).toBe('woho_posts/abc');
    expect(publicIdFromUrl('https://res.cloudinary.com/x/image/upload/v1/otra_carpeta/abc.jpg')).toBeNull();
    expect(imageUrlsFrom('["a","b"]')).toEqual(['a', 'b']);
    expect(imageUrlsFrom('no es json')).toEqual([]);
  });

  it('11. WhatsApp: se normaliza a formato internacional y se rechaza sin código de país', () => {
    expect(normalizePhone('(+56) 9-1234 5678')).toBe('+56912345678');
    expect(normalizePhone('0056 9 1234 5678')).toBe('+56912345678');
    expect(normalizePhone('9 1234 5678')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('12. Contactar exige sesión y publicar exige tener WhatsApp', async () => {
    const noAuth = await request(app).post('/api/posts/1/contact');
    expect(noAuth.statusCode).toBe(401);

    await pool.query("UPDATE users SET phone_whatsapp = NULL WHERE email = 'testuser123@woho.com'");
    const noPhone = await request(app).post('/api/posts').set('Authorization', `Bearer ${userToken}`)
      .field('title', 't').field('description', 'd').field('duration_days', '3').field('category_id', '1');
    expect(noPhone.statusCode).toBe(400);
    expect(noPhone.body.code).toBe('PHONE_REQUIRED');
  });

  it('13. La tarjeta para compartir devuelve metadatos Open Graph y nunca falla', async () => {
    const res = await request(app).get('/api/share/posts/999999');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('og:title');
    expect(res.text).toContain('http-equiv="refresh"');
  });

  it('14. Recuperar contraseña no revela si un correo tiene cuenta', async () => {
    const real = await request(app).post('/api/auth/forgot-password').send({ email: 'testuser123@woho.com' });
    const fake = await request(app).post('/api/auth/forgot-password').send({ email: 'nadie-existe-xyz@woho.com' });
    expect(real.statusCode).toBe(200);
    expect(fake.statusCode).toBe(200);
    expect(real.body.message).toBe(fake.body.message);

    const bad = await request(app).post('/api/auth/reset-password').send({ token: 'x'.repeat(64), password: 'una-clave-larga' });
    expect(bad.statusCode).toBe(400);
  });

  it('15. Eliminar mi cuenta exige sesión y contraseña; la bandeja de eliminaciones es solo del admin', async () => {
    const noAuth = await request(app).post('/api/users/me/delete-request').send({ password: 'x' });
    expect(noAuth.statusCode).toBe(401);

    const noPass = await request(app).post('/api/users/me/delete-request').set('Authorization', `Bearer ${userToken}`).send({});
    expect(noPass.statusCode).toBe(400);

    const wrong = await request(app).post('/api/users/me/delete-request').set('Authorization', `Bearer ${userToken}`).send({ password: 'incorrecta' });
    expect(wrong.statusCode).toBe(401);

    const list = await request(app).get('/api/admin/deletion-requests').set('Authorization', `Bearer ${userToken}`);
    expect(list.statusCode).toBe(403);
  });

  it('16. El resumen diario está protegido con CRON_SECRET', async () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const disabled = await request(app).post('/api/cron/daily-digest');
    expect(disabled.statusCode).toBe(401);

    process.env.CRON_SECRET = 'secreto-de-prueba';
    const wrong = await request(app).post('/api/cron/daily-digest').set('Authorization', 'Bearer otro');
    expect(wrong.statusCode).toBe(401);
    if (prev === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev;
  });

  it('17. Registrarse exige aceptar los términos', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sin Aceptar',
      email: 'sin-aceptar-xyz@woho.com',
      password: 'password_test',
      confirmed_age: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Términos/);
  });

  it('18. Registrarse exige confirmar la mayoría de edad', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sin Edad',
      email: 'sin-edad-xyz@woho.com',
      password: 'password_test',
      accepted_terms: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/años/);
  });

  it('19. Un id que no es número responde 404 y no un error 500', async () => {
    const res = await request(app).get('/api/posts/mine');
    expect(res.statusCode).toBe(404);
  });

  it('20. Cabeceras de seguridad y sin pistas del servidor', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('21. Un JSON mal formado responde 400 sin filtrar detalles internos', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at |node_modules|Unexpected/);
  });

  it('22. El resumen diario solo se dispara con POST y con la clave', async () => {
    const get = await request(app).get('/api/cron/daily-digest');
    expect(get.statusCode).toBe(404);
    const post = await request(app).post('/api/cron/daily-digest');
    expect([401, 503]).toContain(post.statusCode);
  });

  it('23. El inicio de sesión se bloquea tras demasiados intentos fallidos', async () => {
    process.env.RATE_LIMIT_DISABLED = '0';
    try {
      const ip = '203.0.113.77';
      let last;
      for (let i = 0; i < 11; i++) {
        last = await request(app).post('/api/auth/login').set('CF-Connecting-IP', ip)
          .send({ email: 'nadie@woho.com', password: 'incorrecta123' });
      }
      expect(last.statusCode).toBe(429);
      expect(last.body.error).toMatch(/intentos/);
      // Otra IP no queda afectada
      const other = await request(app).post('/api/auth/login').set('CF-Connecting-IP', '203.0.113.78')
        .send({ email: 'nadie@woho.com', password: 'incorrecta123' });
      expect(other.statusCode).not.toBe(429);
    } finally {
      delete process.env.RATE_LIMIT_DISABLED;
    }
  });

  describe('Caducidad de los avisos', () => {
    const createdIds = [];
    const publish = (token, duration) => {
      const r = request(app).post('/api/posts').set('Authorization', `Bearer ${token}`)
        .field('title', 'Aviso de prueba de caducidad').field('description', 'd').field('category_id', '1');
      return duration === undefined ? r : r.field('duration_days', String(duration));
    };

    beforeAll(async () => {
      await request(app).put('/api/users/me').set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test User', phone_whatsapp: '+56912345678' });
    });

    afterAll(async () => {
      if (createdIds.length) await pool.query('DELETE FROM posts WHERE id = ANY($1::int[])', [createdIds]);
      await pool.query("UPDATE users SET role = 'user' WHERE email = 'testuser123@woho.com'");
    });

    it('24. Una persona usuaria puede publicar hasta 30 días, no más', async () => {
      const tooLong = await publish(userToken, 31);
      expect(tooLong.statusCode).toBe(400);
      expect(tooLong.body.error).toMatch(/30 días/);

      const ok = await publish(userToken, 30);
      expect(ok.statusCode).toBe(201);
      createdIds.push(ok.body.id);
      expect(ok.body.duration_days).toBe(30);

      const none = await publish(userToken);
      expect(none.statusCode).toBe(400);
    });

    it('25. Solo el equipo (admin) puede publicar por más tiempo o sin caducidad', async () => {
      await pool.query("UPDATE users SET role = 'admin' WHERE email = 'testuser123@woho.com'");
      const login = await request(app).post('/api/auth/login').send({ email: 'testuser123@woho.com', password: 'password_test' });
      const adminToken = login.body.token;

      const long = await publish(adminToken, 90);
      expect(long.statusCode).toBe(201);
      createdIds.push(long.body.id);

      const forever = await publish(adminToken);
      expect(forever.statusCode).toBe(201);
      createdIds.push(forever.body.id);
      expect(forever.body.expires_at).toBeNull();

      const tooLong = await publish(adminToken, 400);
      expect(tooLong.statusCode).toBe(400);
    });

    it('26. Al editar, la duración se valida y el vencimiento se recalcula desde la creación', async () => {
      const created = await publish(userToken, 20);
      expect(created.statusCode).toBe(201);
      createdIds.push(created.body.id);
      const id = created.body.id;

      const bad = await request(app).put(`/api/posts/${id}`).set('Authorization', `Bearer ${userToken}`).field('duration_days', '31');
      expect(bad.statusCode).toBe(400);

      const ok = await request(app).put(`/api/posts/${id}`).set('Authorization', `Bearer ${userToken}`).field('duration_days', '7');
      expect(ok.statusCode).toBe(200);
      const row = await pool.query("SELECT duration_days, (expires_at::date - created_at::date) AS dias FROM posts WHERE id = $1", [id]);
      expect(row.rows[0].duration_days).toBe(7);
      expect(Number(row.rows[0].dias)).toBe(7);

      // Un aviso antiguo de más de 30 días se puede editar sin tocar su duración.
      await pool.query('UPDATE posts SET duration_days = 60 WHERE id = $1', [id]);
      const legacy = await request(app).put(`/api/posts/${id}`).set('Authorization', `Bearer ${userToken}`)
        .field('title', 'Título nuevo').field('duration_days', '60');
      expect(legacy.statusCode).toBe(200);
    });
  });

  it('27. El registro exige un WhatsApp válido y lo guarda en formato internacional', async () => {
    const base = { name: 'Con Telefono', email: 'con-telefono-xyz@woho.com', password: 'password_test', accepted_terms: true, confirmed_age: true };
    const sin = await request(app).post('/api/auth/register').send(base);
    expect(sin.statusCode).toBe(400);
    expect(sin.body.code).toBe('PHONE_REQUIRED');

    const malo = await request(app).post('/api/auth/register').send({ ...base, phone_whatsapp: '9 1234 5678' });
    expect(malo.statusCode).toBe(400);

    const ok = await request(app).post('/api/auth/register').send({ ...base, phone_whatsapp: '(+56) 9-1234 5678' });
    try {
      expect(ok.statusCode).toBe(201);
      expect(ok.body.user.phone_whatsapp).toBe('+56912345678');
    } finally {
      await pool.query("DELETE FROM users WHERE email = 'con-telefono-xyz@woho.com'");
    }
  });

  it('28. El enlace para compartir usa el dominio del sitio y no se indexa', async () => {
    const res = await request(app).get('/api/share/posts/999999');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/og:url" content="[^"]*\/p\/999999"/);
    expect(res.text).toContain('name="robots" content="noindex"');
  });
});
