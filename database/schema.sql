-- ==========================================
-- SCRIPT DE MIGRACIÓN: BASE DE DATOS WOHO
-- Motor: PostgreSQL
-- ==========================================

-- 1. Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone_whatsapp VARCHAR(20),
    instagram_handle VARCHAR(50),
    facebook_url TEXT,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías (Ej: Trabajo, Alojamiento, Social)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- 3. Tabla de Países (Destinos Principales)
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    flag VARCHAR(10),
    description TEXT,
    image_url TEXT
);

-- 4. Tabla de Ciudades (Dependen de un País)
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- 5. Tabla Central: Avisos / Publicaciones (Posts)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    country_id INTEGER REFERENCES countries(id) ON DELETE SET NULL,
    city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10,2),
    images JSONB,
    duration_days INTEGER,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Favoritos (Relación de Muchos a Muchos)
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE (user_id, post_id) -- Evita que un usuario le de like 2 veces al mismo post
);

-- 7. Tabla de Lugares Seguidos (Feed "Para Ti")
CREATE TABLE user_follows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    UNIQUE (user_id, country_id, city_id) -- Evita seguimientos duplicados
);
