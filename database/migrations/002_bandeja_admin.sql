-- Bandeja del panel de admin: reportes de avisos y mensajes del formulario de contacto.
CREATE TABLE IF NOT EXISTS inbox_messages (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('report', 'contact')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    -- Reportes: el aviso reportado. Se guarda también el título para que el
    -- registro siga teniendo sentido si el aviso se elimina.
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    post_title VARCHAR(150),
    -- Quién lo envía (usuario con sesión) o datos que dejó en el formulario.
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    reason VARCHAR(30),
    message TEXT,
    resolution VARCHAR(30),
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_status_created ON inbox_messages (status, created_at DESC);
-- Una persona no puede abrir dos reportes pendientes sobre el mismo aviso.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inbox_one_open_report
  ON inbox_messages (post_id, user_id) WHERE kind = 'report' AND status = 'open';
