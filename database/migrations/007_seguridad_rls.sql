-- Seguridad en profundidad: activa Row Level Security en todas las tablas del esquema
-- public SIN políticas. Efecto: cualquier rol que no sea el dueño de las tablas (por
-- ejemplo un acceso directo a la base por una API de datos, si algún día se activa) no ve
-- ni modifica nada por defecto. La aplicación se conecta como dueño de las tablas, que
-- ignora RLS, así que su funcionamiento no cambia.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
