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
  ('Irlanda',   '🇮🇪', 'La isla esmeralda con grandes oportunidades en tecnología y servicios.'),
  ('Nueva Zelanda', '🇳🇿', 'Trabajo de temporada, naturaleza y una comunidad viajera muy activa.'),
  ('Canadá',        '🇨🇦', 'Grandes ciudades y trabajo en turismo, hospitalidad y servicios.'),
  ('Francia',       '🇫🇷', 'Cultura, gastronomía y trabajo complementario durante tu estadía.'),
  ('Alemania',      '🇩🇪', 'Economía fuerte y trabajos de vacaciones en toda su geografía.'),
  ('Japón',         '🇯🇵', 'Una estadía pensada para vacacionar, con trabajo para complementar.'),
  ('Corea del Sur', '🇰🇷', 'Cultura vibrante y programa Working Holiday con cupos mensuales.'),
  ('España',        '🇪🇸', 'Acuerdo de movilidad de jóvenes con vida social y cultural intensa.')
) AS v(name, flag, description)
WHERE NOT EXISTS (SELECT 1 FROM countries c WHERE lower(btrim(c.name)) = lower(v.name));

INSERT INTO cities (country_id, name)
SELECT k.id, v.city FROM (VALUES
  ('Australia', 'Sydney'), ('Australia', 'Melbourne'), ('Australia', 'Brisbane'),
  ('Dinamarca', 'Copenhague'), ('Dinamarca', 'Aarhus'),
  ('Irlanda', 'Dublín'),
  ('Nueva Zelanda', 'Auckland'), ('Nueva Zelanda', 'Wellington'), ('Nueva Zelanda', 'Christchurch'),
  ('Canadá', 'Toronto'), ('Canadá', 'Vancouver'), ('Canadá', 'Montreal'),
  ('Francia', 'París'), ('Francia', 'Lyon'),
  ('Alemania', 'Berlín'), ('Alemania', 'Múnich'),
  ('Japón', 'Tokio'), ('Japón', 'Osaka'),
  ('Corea del Sur', 'Seúl'),
  ('España', 'Madrid'), ('España', 'Barcelona')
) AS v(country, city)
JOIN countries k ON lower(btrim(k.name)) = lower(v.country)
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.country_id = k.id AND lower(btrim(c.name)) = lower(v.city)
);
