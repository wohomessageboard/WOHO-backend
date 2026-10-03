-- ==========================================================
-- PROPUESTA (no aplicada): integridad e índices para WOHO
-- Revisar y correr a mano, primero en una copia de la base.
-- Cada bloque indica qué problema corrige y cómo comprobarlo.
-- ==========================================================

-- 1) Seguir un país dos veces.
--    UNIQUE (user_id, country_id, city_id) NO protege cuando city_id es NULL
--    (en Postgres, NULL <> NULL), así que "seguir país" puede duplicarse.
--    Hoy solo lo evita el SELECT previo de addFollowCountry (con carrera posible).
--    Comprobar duplicados existentes:
--      SELECT user_id, country_id, COUNT(*) FROM user_follows
--      WHERE city_id IS NULL GROUP BY 1,2 HAVING COUNT(*) > 1;
--    Si hay, borrar los sobrantes antes de crear el índice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_follows_country
  ON user_follows (user_id, country_id)
  WHERE city_id IS NULL;

-- 2) Correos duplicados por mayúsculas (Ana@x.com vs ana@x.com).
--    Comprobar: SELECT lower(email), COUNT(*) FROM users GROUP BY 1 HAVING COUNT(*) > 1;
--    (Conviene además normalizar a minúsculas en el registro y el login.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON users (lower(email));

-- 3) Consultas frecuentes sin índice: listado por país/vigencia, mis avisos,
--    favoritos por aviso y ciudades por país.
CREATE INDEX IF NOT EXISTS idx_posts_country_expires ON posts (country_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post ON favorites (post_id);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities (country_id);

-- 4) Duración coherente (la API ya valida 1-365; esto lo garantiza en la base).
--    Comprobar filas existentes:
--      SELECT id, duration_days FROM posts WHERE duration_days IS NOT NULL AND duration_days NOT BETWEEN 1 AND 365;
ALTER TABLE posts
  ADD CONSTRAINT chk_posts_duration CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 365)
  NOT VALID;  -- NOT VALID no revisa filas viejas; luego: ALTER TABLE posts VALIDATE CONSTRAINT chk_posts_duration;

-- 5) Nombres repetidos en catálogos (el panel admin permite crear "Trabajo" dos veces).
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_lower ON categories (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_countries_name_lower ON countries (lower(name));
