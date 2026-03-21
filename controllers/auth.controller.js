import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Registro de usuario (POST /api/auth/register)
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validación básica de campos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si el usuario ya existe
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña (hash)
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Insertar el usuario en la BD
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, 'user']
    );

    // Devolver un código 201 de creado junto con la info (sin la contraseña encriptada)
    return res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ error: 'Error del servidor al registrar' });
  }
};

// Login de usuario (POST /api/auth/login)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    // Buscar al usuario por correo
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userData = user.rows[0];

    // Comparar contraseña plana con el hash guardado en BD
    const validPassword = await bcryptjs.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar Token JWT con una duración de 1 hora
    const payload = { id: userData.id, email: userData.email, role: userData.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Devolver el token generado
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
  }
};
