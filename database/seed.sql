-- Datos iniciales del catálogo (categorías, países y ciudades). Es seguro correrlo más
-- de una vez: lo que ya existe (sin distinguir mayúsculas) no se duplica.
-- Uso:  npm run seed
-- Después puedes agregar/editar destinos y categorías desde el panel de admin.

INSERT INTO categories (name)
SELECT v.name FROM (VALUES ('Trabajo'), ('Alojamiento'), ('Social'), ('Otro')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE lower(btrim(c.name)) = lower(v.name));

INSERT INTO countries (name, flag, description)
SELECT v.name, v.flag, v.description FROM (VALUES
  ('Australia', '🇦🇺', 'Destino líder para Farm Work y Hospitality.'),
  ('Dinamarca', '🇩🇰', 'Excelente calidad de vida en el corazón de Escandinavia.'),
  ('Irlanda',   '🇮🇪', 'La isla esmeralda con grandes oportunidades en tecnología y servicios.')
) AS v(name, flag, description)
WHERE NOT EXISTS (SELECT 1 FROM countries c WHERE lower(btrim(c.name)) = lower(v.name));

INSERT INTO cities (country_id, name)
SELECT k.id, v.city FROM (VALUES
  ('Australia', 'Sydney'), ('Australia', 'Melbourne'), ('Australia', 'Brisbane'),
  ('Dinamarca', 'Copenhague'), ('Dinamarca', 'Aarhus'),
  ('Irlanda', 'Dublín')
) AS v(country, city)
JOIN countries k ON lower(btrim(k.name)) = lower(v.country)
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.country_id = k.id AND lower(btrim(c.name)) = lower(v.city)
);
