-- Cifra destacada opcional de la nota principal, para la imagen para redes
-- (la tarjeta "100+"). Si queda vacía, la imagen sale solo con el titular.
ALTER TABLE editions ADD COLUMN stat_value TEXT;
ALTER TABLE editions ADD COLUMN stat_caption_es TEXT;
ALTER TABLE editions ADD COLUMN stat_caption_en TEXT;
