import pool from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { destroyImagesByUrls, imageUrlsFrom } from '../config/cloudinary.js';
import { normalizePhone } from '../utils/phone.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
        AND u.deletion_requested_at IS NULL
        AND (p.expires_at >= CURRENT_DATE OR p.expires_at IS NULL)
    `;

    const values = [];
    let count = 1;

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
    // Visitantes: el listado no revela quién publicó (la interfaz ya lo muestra como "Viajero protegido").
    const rows = req.user ? result.rows : result.rows.map((r) => ({ ...r, author_name: null }));
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error en getPosts:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener avisos' });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.id, p.title, p.description, p.duration_days, p.expires_at, p.images, p.created_at, p.is_pinned,
             p.user_id, p.category_id, p.country_id, p.city_id,
             u.name as author_name, u.avatar_url as author_avatar,
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

    const postData = result.rows[0];
    const formattedPost = {
      ...postData,
      country: postData.country_name,
      city: postData.city_name,
      owner: {
        id: postData.user_id,
        name: postData.author_name,
        avatar: postData.author_avatar
      }
    };

    // El correo y el teléfono NUNCA salen en este endpoint: el contacto es por WhatsApp
    // y se entrega al pulsar "Escribir por WhatsApp" (POST /posts/:id/contact).
    // Sin sesión tampoco se entrega la identidad de quien publica.
    if (!req.user) {
      delete formattedPost.author_name;
      delete formattedPost.author_avatar;
      formattedPost.owner = { id: postData.user_id };
    }

    return res.status(200).json(formattedPost);
  } catch (error) {
    console.error('Error en getPostById:', error);
    return res.status(500).json({ error: 'Error interno obteniendo detalle del post' });
  }
};

const MAX_DURATION_DAYS = 365;

// Devuelve un mensaje de error si la duración no es un entero entre 1 y 365.
const durationError = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DURATION_DAYS) {
    return `La duración debe ser un número entero de días entre 1 y ${MAX_DURATION_DAYS}.`;
  }
  return null;
};

export const createPost = async (req, res) => {
  try {
    const { title, description, duration_days, country_id, city_id, category_id } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    if (!title || !description) {
      return res.status(400).json({ error: 'Título y descripción son obligatorios' });
    }

    if (!category_id) {
      return res.status(400).json({ error: 'Elige una categoría para tu aviso' });
    }

    // Para publicar hace falta un WhatsApp válido: es la forma en que te contactan.
    const owner = await pool.query('SELECT phone_whatsapp FROM users WHERE id = $1', [user_id]);
    if (!normalizePhone(owner.rows[0]?.phone_whatsapp)) {
      return res.status(400).json({ error: 'Agrega tu WhatsApp para publicar: es el medio por el que te contactarán.', code: 'PHONE_REQUIRED' });
    }

    if (user_role === 'user' && !duration_days) {
      return res.status(400).json({ error: 'La duración es requerida para viajeros' });
    }

    const badDuration = durationError(duration_days);
    if (badDuration) {
      return res.status(400).json({ error: badDuration });
    }

    const fileUploadPromises = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'woho_posts',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                console.error('Fallo carga en Cloudinary:', error);
                reject(error);
              } else {
                resolve(result.secure_url);
              }
            }
          );
          stream.end(file.buffer);
        });
        fileUploadPromises.push(uploadPromise);
      }
    }

    const uploadedImagesUrls = await Promise.all(fileUploadPromises);

    const imagesJSON = JSON.stringify(uploadedImagesUrls);

    let queryString = '';
    let queryValues = [];

    if (duration_days) {

      queryString = `
        INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id)
        VALUES ($1, $2, $3, CURRENT_DATE + CAST($3 AS INTEGER), $4, $5, $6, $7, $8)
        RETURNING *`;
      queryValues = [title, description, duration_days, imagesJSON, user_id, country_id || null, city_id || null, category_id || null];
    } else {

      queryString = `
        INSERT INTO posts (title, description, duration_days, expires_at, images, user_id, country_id, city_id, category_id)
        VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $7)
        RETURNING *`;
      queryValues = [title, description, imagesJSON, user_id, country_id || null, city_id || null, category_id || null];
    }

    let result;
    try {
      result = await pool.query(queryString, queryValues);
    } catch (dbError) {
      // Las fotos ya estaban en Cloudinary: se borran para no dejarlas huérfanas.
      await destroyImagesByUrls(uploadedImagesUrls);
      throw dbError;
    }

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear el post:', error);
    return res.status(500).json({ error: 'Error interno al crear el post' });
  }
};

export const getFeed = async (req, res) => {
  try {
    const userId = req.user.id;

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
        AND u.deletion_requested_at IS NULL
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

export const deletePost = async (req, res) => {
  const client = await pool.connect();
  try {
    const postId = req.params.id;

    await client.query('BEGIN');

    // Guardamos las fotos antes de borrar el aviso para poder limpiarlas de Cloudinary.
    const found = await client.query('SELECT images FROM posts WHERE id = $1', [postId]);
    if (found.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post no encontrado' });
    }
    const imageUrls = imageUrlsFrom(found.rows[0].images);

    // 1. Borramos las referencias en favoritos para evitar error de FK
    await client.query('DELETE FROM favorites WHERE post_id = $1', [postId]);

    // 2. Los reportes pendientes de este aviso quedan resueltos
    await client.query(
      `UPDATE inbox_messages SET status = 'resolved', resolution = 'post_deleted', resolved_by = $2, resolved_at = now()
       WHERE post_id = $1 AND status = 'open'`,
      [postId, req.user?.id ?? null]
    );

    // 3. Borramos el post
    await client.query('DELETE FROM posts WHERE id = $1', [postId]);

    await client.query('COMMIT');

    // 4. Fotos: después del COMMIT, y sin que un fallo de Cloudinary rompa la respuesta.
    await destroyImagesByUrls(imageUrls);

    return res.status(200).json({ message: 'Aviso eliminado correctamente, con sus fotos' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en deletePost:', error);
    return res.status(500).json({ error: 'Error del servidor al eliminar el post' });
  } finally {
    client.release();
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration_days, country_id, city_id, category_id } = req.body;
    const user_id = req.user.id;

    const badDuration = durationError(duration_days);
    if (badDuration) {
      return res.status(400).json({ error: badDuration });
    }

    const postCheck = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (postCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }

    let imagesJSON = postCheck.rows[0].images;
    let replacedUrls = [];

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
      replacedUrls = imageUrlsFrom(postCheck.rows[0].images);
    }

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

    // Las fotos anteriores ya no se usan: se eliminan de Cloudinary.
    await destroyImagesByUrls(replacedUrls);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar post:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar el aviso' });
  }
};

// ---- Reportar un aviso ------------------------------------------------------
// Llega a la bandeja del panel de admin (tabla inbox_messages, kind = 'report').
const REPORT_REASONS = ['spam', 'estafa', 'ofensivo', 'falso', 'otro'];

export const reportPost = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { reason, message } = req.body;

    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'Aviso inválido' });
    }
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Elige el motivo del reporte' });
    }
    const details = typeof message === 'string' ? message.trim().slice(0, 500) : '';

    const post = await pool.query('SELECT id, title, user_id FROM posts WHERE id = $1', [postId]);
    if (post.rowCount === 0) {
      return res.status(404).json({ error: 'Aviso no encontrado' });
    }
    if (post.rows[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'No puedes reportar tu propio aviso' });
    }

    const who = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);

    try {
      await pool.query(
        `INSERT INTO inbox_messages (kind, post_id, post_title, user_id, name, email, reason, message)
         VALUES ('report', $1, $2, $3, $4, $5, $6, $7)`,
        [postId, post.rows[0].title, req.user.id, who.rows[0]?.name ?? null, who.rows[0]?.email ?? null, reason, details || null]
      );
    } catch (dbError) {
      if (dbError.code === '23505') {
        return res.status(409).json({ error: 'Ya reportaste este aviso. Lo revisaremos pronto.' });
      }
      throw dbError;
    }

    return res.status(201).json({ message: 'Gracias por avisarnos. El equipo de WOHO revisará este aviso.' });
  } catch (error) {
    console.error('Error en reportPost:', error);
    return res.status(500).json({ error: 'No pudimos enviar tu reporte. Intenta de nuevo.' });
  }
};

// ---- Contactar por WhatsApp -------------------------------------------------
// Con sesión, devuelve el enlace wa.me con el mensaje ya escrito y el enlace del aviso
// (que al compartirse muestra una tarjeta, ver share.controller). El número solo sale
// aquí, al pulsar el botón; no viaja en el detalle del aviso.
const CONTACTS_PER_DAY = 20;

export const publicApiUrl = (req) =>
  (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`).replace(/\/+$/, '');

export const contactPost = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId)) return res.status(400).json({ error: 'Aviso inválido' });

    const found = await pool.query(
      `SELECT p.id, p.title, p.user_id, u.phone_whatsapp
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1 AND p.is_active = true AND u.deletion_requested_at IS NULL AND (p.expires_at >= CURRENT_DATE OR p.expires_at IS NULL)`,
      [postId]
    );
    if (found.rowCount === 0) return res.status(404).json({ error: 'Este aviso ya no está disponible' });

    const post = found.rows[0];
    if (post.user_id === req.user.id) return res.status(400).json({ error: 'Este aviso es tuyo' });

    const phone = normalizePhone(post.phone_whatsapp);
    if (!phone) {
      return res.status(409).json({ error: 'Esta persona aún no dejó un WhatsApp de contacto. Puedes avisarnos desde «Contacto».' });
    }

    const recent = await pool.query(
      "SELECT COUNT(*)::int AS n FROM post_contacts WHERE user_id = $1 AND created_at > now() - interval '1 day'",
      [req.user.id]
    );
    if (recent.rows[0].n >= CONTACTS_PER_DAY) {
      return res.status(429).json({ error: 'Hoy ya contactaste a muchas personas. Intenta de nuevo mañana.' });
    }

    await pool.query('INSERT INTO post_contacts (post_id, user_id) VALUES ($1, $2)', [postId, req.user.id]);

    const shareUrl = `${publicApiUrl(req)}/share/posts/${postId}`;
    const text = `Hola, vi tu aviso «${post.title}» en WOHO y me interesa. ${shareUrl}`;
    return res.status(200).json({ url: `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}` });
  } catch (error) {
    console.error('Error en contactPost:', error);
    return res.status(500).json({ error: 'No pudimos abrir el contacto. Intenta de nuevo.' });
  }
};
