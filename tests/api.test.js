import request from 'supertest';
import app from '../index.js';
import pool from '../config/db.js';
import { publicIdFromUrl, imageUrlsFrom } from '../config/cloudinary.js';

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
      password: 'password_test'
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
});
