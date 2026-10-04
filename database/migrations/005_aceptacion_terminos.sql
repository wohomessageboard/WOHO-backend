-- Constancia de que cada persona aceptó los Términos y la Política de Privacidad:
-- cuándo y qué versión. Las cuentas anteriores quedan en NULL y se les pide aceptar
-- la próxima vez que entren.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(40);
