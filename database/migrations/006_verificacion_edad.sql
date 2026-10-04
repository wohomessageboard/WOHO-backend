-- Constancia de que la persona confirmó ser mayor de edad al registrarse.
-- Las cuentas anteriores quedan en NULL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;
