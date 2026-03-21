-- Crear base de datos
-- CREATE DATABASE woho;
-- \c woho;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' -- Puede ser 'user', 'admin', 'superadmin'
);

-- Tabla de países
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de ciudades relacionadas con países
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE
);

-- Tabla de categorías para los posts
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de posts (avisos)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  expires_at DATE NOT NULL,
  images JSONB, -- Array de URLs de imágenes
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de favoritos (relación N:M entre usuarios y posts)
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- Tabla de seguimiento (relación N:M entre usuarios) - "Para Ti" Feed
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  followed_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (follower_id, followed_id)
);

-- Insertar algunos datos base de ejemplo (opcional)
INSERT INTO countries (name) VALUES ('Australia'), ('Nueva Zelanda') ON CONFLICT DO NOTHING;
INSERT INTO cities (name, country_id) VALUES ('Sídney', 1), ('Melbourne', 1), ('Auckland', 2) ON CONFLICT DO NOTHING;
INSERT INTO categories (name) VALUES ('Alojamiento'), ('Trabajo'), ('Venta de Auto') ON CONFLICT DO NOTHING;
