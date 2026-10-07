-- Datos iniciales del catálogo (categorías, países y ciudades). Cada destino trae 20 ciudades
-- principales para quien viaja con Working Holiday (grandes ciudades y también pueblos de
-- trabajo de temporada), para que ya se pueda elegir al publicar. Es seguro correrlo más
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
  ('Australia', 'Sydney'), ('Australia', 'Melbourne'), ('Australia', 'Brisbane'), ('Australia', 'Perth'), ('Australia', 'Adelaide'),
  ('Australia', 'Gold Coast'), ('Australia', 'Cairns'), ('Australia', 'Darwin'), ('Australia', 'Hobart'), ('Australia', 'Canberra'),
  ('Australia', 'Newcastle'), ('Australia', 'Sunshine Coast'), ('Australia', 'Townsville'), ('Australia', 'Byron Bay'), ('Australia', 'Bundaberg'),
  ('Australia', 'Mildura'), ('Australia', 'Shepparton'), ('Australia', 'Young'), ('Australia', 'Margaret River'), ('Australia', 'Alice Springs'),
  ('Nueva Zelanda', 'Auckland'), ('Nueva Zelanda', 'Wellington'), ('Nueva Zelanda', 'Christchurch'), ('Nueva Zelanda', 'Queenstown'), ('Nueva Zelanda', 'Hamilton'),
  ('Nueva Zelanda', 'Tauranga'), ('Nueva Zelanda', 'Dunedin'), ('Nueva Zelanda', 'Napier'), ('Nueva Zelanda', 'Nelson'), ('Nueva Zelanda', 'Rotorua'),
  ('Nueva Zelanda', 'Wanaka'), ('Nueva Zelanda', 'Hastings'), ('Nueva Zelanda', 'Blenheim'), ('Nueva Zelanda', 'Palmerston North'), ('Nueva Zelanda', 'Whangarei'),
  ('Nueva Zelanda', 'New Plymouth'), ('Nueva Zelanda', 'Taupo'), ('Nueva Zelanda', 'Invercargill'), ('Nueva Zelanda', 'Timaru'), ('Nueva Zelanda', 'Kerikeri'),
  ('Canadá', 'Toronto'), ('Canadá', 'Vancouver'), ('Canadá', 'Montreal'), ('Canadá', 'Calgary'), ('Canadá', 'Ottawa'),
  ('Canadá', 'Edmonton'), ('Canadá', 'Quebec'), ('Canadá', 'Winnipeg'), ('Canadá', 'Victoria'), ('Canadá', 'Halifax'),
  ('Canadá', 'Whistler'), ('Canadá', 'Banff'), ('Canadá', 'Kelowna'), ('Canadá', 'Canmore'), ('Canadá', 'Jasper'),
  ('Canadá', 'Niagara Falls'), ('Canadá', 'Saskatoon'), ('Canadá', 'Regina'), ('Canadá', 'Mississauga'), ('Canadá', 'Whitehorse'),
  ('Francia', 'París'), ('Francia', 'Lyon'), ('Francia', 'Marsella'), ('Francia', 'Niza'), ('Francia', 'Burdeos'),
  ('Francia', 'Toulouse'), ('Francia', 'Estrasburgo'), ('Francia', 'Nantes'), ('Francia', 'Montpellier'), ('Francia', 'Lille'),
  ('Francia', 'Rennes'), ('Francia', 'Grenoble'), ('Francia', 'Aviñón'), ('Francia', 'Cannes'), ('Francia', 'Annecy'),
  ('Francia', 'Chamonix'), ('Francia', 'Dijon'), ('Francia', 'Reims'), ('Francia', 'Biarritz'), ('Francia', 'Perpiñán'),
  ('Alemania', 'Berlín'), ('Alemania', 'Múnich'), ('Alemania', 'Hamburgo'), ('Alemania', 'Fráncfort'), ('Alemania', 'Colonia'),
  ('Alemania', 'Stuttgart'), ('Alemania', 'Düsseldorf'), ('Alemania', 'Leipzig'), ('Alemania', 'Dresde'), ('Alemania', 'Núremberg'),
  ('Alemania', 'Hannover'), ('Alemania', 'Bremen'), ('Alemania', 'Heidelberg'), ('Alemania', 'Friburgo'), ('Alemania', 'Bonn'),
  ('Alemania', 'Dortmund'), ('Alemania', 'Essen'), ('Alemania', 'Maguncia'), ('Alemania', 'Karlsruhe'), ('Alemania', 'Potsdam'),
  ('Japón', 'Tokio'), ('Japón', 'Osaka'), ('Japón', 'Kioto'), ('Japón', 'Nagoya'), ('Japón', 'Fukuoka'),
  ('Japón', 'Sapporo'), ('Japón', 'Yokohama'), ('Japón', 'Kobe'), ('Japón', 'Hiroshima'), ('Japón', 'Sendai'),
  ('Japón', 'Nara'), ('Japón', 'Kanazawa'), ('Japón', 'Naha'), ('Japón', 'Niseko'), ('Japón', 'Hakuba'),
  ('Japón', 'Nagano'), ('Japón', 'Kawasaki'), ('Japón', 'Kumamoto'), ('Japón', 'Nagasaki'), ('Japón', 'Matsuyama'),
  ('Corea del Sur', 'Seúl'), ('Corea del Sur', 'Busan'), ('Corea del Sur', 'Incheon'), ('Corea del Sur', 'Daegu'), ('Corea del Sur', 'Daejeon'),
  ('Corea del Sur', 'Gwangju'), ('Corea del Sur', 'Suwon'), ('Corea del Sur', 'Ulsan'), ('Corea del Sur', 'Jeju'), ('Corea del Sur', 'Gangneung'),
  ('Corea del Sur', 'Jeonju'), ('Corea del Sur', 'Gyeongju'), ('Corea del Sur', 'Chuncheon'), ('Corea del Sur', 'Pohang'), ('Corea del Sur', 'Changwon'),
  ('Corea del Sur', 'Cheongju'), ('Corea del Sur', 'Andong'), ('Corea del Sur', 'Sokcho'), ('Corea del Sur', 'Yeosu'), ('Corea del Sur', 'Seongnam'),
  ('España', 'Madrid'), ('España', 'Barcelona'), ('España', 'Valencia'), ('España', 'Sevilla'), ('España', 'Málaga'),
  ('España', 'Bilbao'), ('España', 'Zaragoza'), ('España', 'Palma de Mallorca'), ('España', 'Granada'), ('España', 'Alicante'),
  ('España', 'San Sebastián'), ('España', 'Santiago de Compostela'), ('España', 'Las Palmas de Gran Canaria'), ('España', 'Santa Cruz de Tenerife'), ('España', 'Ibiza'),
  ('España', 'Valladolid'), ('España', 'Córdoba'), ('España', 'Murcia'), ('España', 'Vigo'), ('España', 'Salamanca'),
  ('Dinamarca', 'Copenhague'), ('Dinamarca', 'Aarhus'), ('Dinamarca', 'Odense'), ('Dinamarca', 'Aalborg'), ('Dinamarca', 'Esbjerg'),
  ('Dinamarca', 'Roskilde'), ('Dinamarca', 'Kolding'), ('Dinamarca', 'Horsens'), ('Dinamarca', 'Vejle'), ('Dinamarca', 'Silkeborg'),
  ('Dinamarca', 'Herning'), ('Dinamarca', 'Randers'), ('Dinamarca', 'Fredericia'), ('Dinamarca', 'Helsingør'), ('Dinamarca', 'Svendborg'),
  ('Dinamarca', 'Viborg'), ('Dinamarca', 'Billund'), ('Dinamarca', 'Skagen'), ('Dinamarca', 'Ribe'), ('Dinamarca', 'Sønderborg'),
  ('Irlanda', 'Dublín'), ('Irlanda', 'Cork'), ('Irlanda', 'Galway'), ('Irlanda', 'Limerick'), ('Irlanda', 'Waterford'),
  ('Irlanda', 'Kilkenny'), ('Irlanda', 'Drogheda'), ('Irlanda', 'Dundalk'), ('Irlanda', 'Sligo'), ('Irlanda', 'Tralee'),
  ('Irlanda', 'Killarney'), ('Irlanda', 'Athlone'), ('Irlanda', 'Wexford'), ('Irlanda', 'Letterkenny'), ('Irlanda', 'Ennis'),
  ('Irlanda', 'Carlow'), ('Irlanda', 'Navan'), ('Irlanda', 'Bray'), ('Irlanda', 'Dingle'), ('Irlanda', 'Westport')
) AS v(country, city)
JOIN countries k ON lower(btrim(k.name)) = lower(v.country)
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.country_id = k.id AND lower(btrim(c.name)) = lower(v.city)
);
