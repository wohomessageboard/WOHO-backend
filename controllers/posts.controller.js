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
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at, p.is_pinned,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name,
             cat.name as type, c.name as country, ci.name as city
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.is_active = true 
        AND (p.expires_at >= CURRENT_DATE OR p.expires_at IS NULL)
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

    query += ` ORDER BY p.is_pinned DESC, p.expires_at ASC NULLS LAST, p.created_at DESC`;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en getPosts:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener avisos' });
  }
};

// Obtener un post por ID (GET /api/posts/:id)
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at, p.is_pinned,
             p.user_id, p.category_id, p.country_id, p.city_id,
             u.name as author_name, u.email as author_email, u.phone_whatsapp as author_phone, u.avatar_url as author_avatar,
             c.name as country_name, ci.name as city_name, cat.name as category_name, cat.name as type
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    // Adaptar nombres para el frontend
    const postData = result.rows[0];
    const formattedPost = {
      ...postData,
      country: postData.country_name,
      city: postData.city_name,
      owner: {
        id: postData.user_id,
        name: postData.author_name,
        email: postData.author_email,
        phone: postData.author_phone,
        avatar: postData.author_avatar
      }
    };

    return res.status(200).json(formattedPost);
  } catch (error) {
    console.error('Error en getPostById:', error);
    return res.status(500).json({ error: 'Error interno obteniendo detalle del post' });
  }
};

// Crear un Post (POST /api/posts) Privado con subida de imágenes y cálculo de fecha
export const createPost = async (req, res) => {
  try {
    const { title, description, duration_days, country_id, city_id, category_id } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // Validación básica general
    if (!title || !description) {
      return res.status(400).json({ error: 'Título y descripción son obligatorios' });
    }

    // Validación según Rol
    if (user_role === 'user' && !duration_days) {
      return res.status(400).json({ error: 'La duración es requerida para viajeros' });
    }

    // Subir imágenes a Cloudinary usando el buffer en memoria de multer
    const fileUploadPromises = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'woho_posts',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }, // Redimensionar si es gigante
                { fetch_format: 'auto' } // Entregar en formato óptimo (WebP si es posible)
              ]
            },
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

    // Calcular la consulta dinámica para permitir Nulls en Admins
    let queryString = '';
    let queryValues = [];

    if (duration_days) {
      // Tiene expiración (Users estándar o Admins que decidieron poner duración)
      queryString = `
        INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id)
        VALUES ($1, $2, $3, CURRENT_DATE + CAST($3 AS INTEGER), $4, $5, $6, $7, $8)
        RETURNING *`;
      queryValues = [title, description, duration_days, imagesJSON, user_id, country_id || null, city_id || null, category_id || null];
    } else {
      // No tiene duración (Solo alcanzable por Admin/Superadmin debido a validación superior)
      queryString = `
        INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id)
        VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7)
        RETURNING *`;
      queryValues = [title, description, imagesJSON, user_id, country_id || null, city_id || null, category_id || null];
    }

    const result = await pool.query(queryString, queryValues);

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
    
    // Seleccionar posts basados en los países y ciudades que sigue el usuario
    const query = `
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at, p.is_pinned,
             u.name as author_name, c.name as country_name, ci.name as city_name, cat.name as category_name,
             cat.name as type, c.name as country, ci.name as city
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN countries c ON p.country_id = c.id
      LEFT JOIN cities ci ON p.city_id = ci.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.is_active = true
        AND (p.expires_at >= CURRENT_DATE OR p.expires_at IS NULL)
        AND EXISTS (
          SELECT 1 FROM user_follows uf
          WHERE uf.user_id = $1
            AND uf.country_id = p.country_id
            AND (uf.city_id IS NULL OR uf.city_id = p.city_id)
        )
      ORDER BY p.is_pinned DESC, p.expires_at ASC NULLS LAST, p.created_at DESC
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

// Actualizar un Post (PUT /api/posts/:id)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration_days, country_id, city_id, category_id } = req.body;
    const user_id = req.user.id;

    // 1. Verificar si el post existe y obtener datos actuales
    const postCheck = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (postCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    // 2. Manejo de imágenes (Opcional en Update)
    let imagesJSON = postCheck.rows[0].images; // Por defecto mantenemos las viejas si no se envían nuevas

    if (req.files && req.files.length > 0) {
      const fileUploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'woho_posts',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      });

      const uploadedImagesUrls = await Promise.all(fileUploadPromises);
      imagesJSON = JSON.stringify(uploadedImagesUrls);
    }

    // 3. Ejecutar UPDATE
    // Solo permitimos el update si el usuario es el dueño (user_id coincide)
    // El middleware general también puede implementarse aparte, pero aquí añadimos seguridad extra en el query.
    const result = await pool.query(
      `UPDATE posts 
       SET title = $1, description = $2, duration_days = $3, 
           country_id = $4, city_id = $5, category_id = $6, images = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        title || postCheck.rows[0].title,
        description || postCheck.rows[0].description,
        duration_days || postCheck.rows[0].duration_days,
        country_id || postCheck.rows[0].country_id,
        city_id || postCheck.rows[0].city_id,
        category_id || postCheck.rows[0].category_id,
        imagesJSON,
        id,
        user_id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'No tienes permiso para editar este aviso' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar post:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar el aviso' });
  }
};
