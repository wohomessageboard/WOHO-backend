-- 1) Solicitudes de eliminación de cuenta -------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS deletion_requests (
    id SERIAL PRIMARY KEY,
    -- Sin FK a propósito: al ejecutarse la eliminación el usuario ya no existe, y el
    -- registro debe sobrevivir como constancia (solo con fechas, sin datos personales).
    user_id INTEGER NOT NULL,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status_due ON deletion_requests (status, due_at);
-- Una sola solicitud pendiente por persona.
CREATE UNIQUE INDEX IF NOT EXISTS uq_deletion_one_pending ON deletion_requests (user_id) WHERE status = 'pending';

-- 2) Recuperar contraseña ---------------------------------------------------------
-- Se guarda solo el hash del código (nunca el código): si alguien leyera la base no
-- podría usarlo. Vence en 1 hora y sirve una sola vez.
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id, created_at DESC);

-- 3) Resumen diario al admin ---------------------------------------------------------
ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
