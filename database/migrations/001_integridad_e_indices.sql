-- Integridad e índices. Es segura de correr varias veces; si encuentra datos que
-- hay que decidir a mano (correos o catálogos repetidos) se detiene con un
-- mensaje claro y NO cambia nada (corre dentro de una transacción).

-- 0) Datos que no se pueden unificar solos ------------------------------------
DO $$
DECLARE dup TEXT;
BEGIN
  SELECT string_agg(k, ', ') INTO dup FROM (
    SELECT lower(btrim(email)) AS k FROM users GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Hay cuentas con el mismo correo (ignorando mayúsculas): %. Unifícalas o bórralas y vuelve a correr.', dup;
  END IF;

  SELECT string_agg(k, ', ') INTO dup FROM (
    SELECT lower(btrim(name)) AS k FROM categories GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Categorías repetidas: %. Deja una sola (y reasigna sus avisos) y vuelve a correr.', dup;
  END IF;

  SELECT string_agg(k, ', ') INTO dup FROM (
    SELECT lower(btrim(name)) AS k FROM countries GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Países repetidos: %. Deja uno solo (y reasigna sus avisos) y vuelve a correr.', dup;
  END IF;

  SELECT string_agg(k, ', ') INTO dup FROM (
    SELECT country_id || ':' || lower(btrim(name)) AS k FROM cities GROUP BY country_id, lower(btrim(name)) HAVING COUNT(*) > 1
  ) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Ciudades repetidas dentro de un mismo país (país:ciudad): %.', dup;
  END IF;
END $$;

-- 1) Correo único sin importar mayúsculas ------------------------------------
UPDATE users SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (lower(email));

-- 2) Seguir un destino no se puede duplicar ----------------------------------
--    UNIQUE (user_id, country_id, city_id) no frena filas con city_id NULL
--    (NULL <> NULL), que son las de "seguir país". Primero se limpian los
--    duplicados exactos y luego se protege con un índice parcial.
DELETE FROM user_follows a
USING user_follows b
WHERE a.city_id IS NULL AND b.city_id IS NULL
  AND a.user_id = b.user_id AND a.country_id = b.country_id
  AND a.id > b.id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_follows_country
  ON user_follows (user_id, country_id) WHERE city_id IS NULL;

-- 3) Catálogos sin nombres repetidos -----------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_lower ON categories (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_countries_name_lower ON countries (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_cities_country_name_lower ON cities (country_id, lower(btrim(name)));

-- 4) Duración coherente (la API valida 1-365; aquí se garantiza en la base) ---
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_posts_duration') THEN
    ALTER TABLE posts
      ADD CONSTRAINT chk_posts_duration
      CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 365) NOT VALID;
  END IF;
END $$;

-- 5) Índices para las consultas más usadas -----------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_country_expires ON posts (country_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post ON favorites (post_id);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities (country_id);
