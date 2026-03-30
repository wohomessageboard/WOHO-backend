import request from 'supertest';
import app from '../index.js';
import pool from '../config/db.js';

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
    
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', 'testuser123@woho.com');
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
});
