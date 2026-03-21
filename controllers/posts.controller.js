import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuramos Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Obtener posts de forma pública (GET /api/posts) con filtros opcionales
export const getPosts = async (req, res) => {
  try {
    const { country, city, category } = req.query;

    let query = `
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE 1=1 AND p.expires_at >= CURRENT_DATE
    `;

    const values = [];
    let count = 1;

    // Agregar filtros dinámicos usando JOINs y coincidencia exacta
    if (country) {
      query += ` AND c.name = $${count}`;
      values.push(country);
      count++;
    }
    if (city) {
      query += ` AND ci.name = $${count}`;
      values.push(city);
      count++;
    }
    if (category) {
      query += ` AND cat.name = $${count}`;
      values.push(category);
      count++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en getPosts:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener avisos' });
  }
};

// Crear un Post (POST /api/posts) Privado con subida de imágenes y cálculo de fecha
export const createPost = async (req, res) => {
  try {
    const { title, description, duration_days, country_id, city_id, category_id } = req.body;
    const user_id = req.user.id;

    if (!title || !description || !duration_days) {
      return res.status(400).json({ error: 'Título, descripción y días de duración son obligatorios' });
    }

    // Subir imágenes a Cloudinary usando el buffer en memoria de multer
    const fileUploadPromises = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'woho_posts' },
            (error, result) => {
              if (error) {
                console.error('Fallo carga en Cloudinary:', error);
                reject(error);
              } else {
                resolve(result.secure_url); // Guardamos la URL segura que nos da Cloudinary
              }
            }
          );
          stream.end(file.buffer); // Pasar la imagen en memoria hacia la nube
        });
        fileUploadPromises.push(uploadPromise);
      }
    }

    // Esperar a que se suban todas las imágenes paralelas y se generen las URLs
    const uploadedImagesUrls = await Promise.all(fileUploadPromises);
    
    // Lo guardamos como string JSON
    const imagesJSON = JSON.stringify(uploadedImagesUrls);

    // Calcular la fecha de expiración mediante la función en la BBDD a través de CURRENT_DATE
    const result = await pool.query(
      `INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id)
       VALUES ($1, $2, $3, CURRENT_DATE + CAST($3 AS INTEGER), $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, duration_days, imagesJSON, user_id, country_id || null, city_id || null, category_id || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear el post:', error);
    return res.status(500).json({ error: 'Error interno al crear el post' });
  }
};

// Obtener avisos "Para Ti" (GET /api/posts/feed)
export const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Seleccionar posts de los usuarios que el usuario logueado sigue
    const query = `
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      JOIN user_follows uf ON p.user_id = uf.followed_id
      WHERE uf.follower_id = $1 AND p.expires_at >= CURRENT_DATE
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en feed:', error);
    return res.status(500).json({ error: 'Error del servidor al cargar feed' });
  }
};

// Eliminar un Post (DELETE /api/posts/:id)
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    // Como el middleware ya verificó permisos y si existe, solo borramos de frente
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    return res.status(200).json({ message: 'Aviso eliminado correctamente' });
  } catch (error) {
    console.error('Error en deletePost:', error);
    return res.status(500).json({ error: 'Error del servidor al eliminar el post' });
  }
};
