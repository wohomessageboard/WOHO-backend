-- Registro de contactos por WhatsApp: cada vez que alguien pulsa "Escribir por WhatsApp"
-- en un aviso. Sirve para limitar abusos (scraping de números) y como evidencia si hay
-- una denuncia. No guarda el mensaje ni el número.
CREATE TABLE IF NOT EXISTS post_contacts (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_contacts_user_created ON post_contacts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_contacts_post ON post_contacts (post_id);
