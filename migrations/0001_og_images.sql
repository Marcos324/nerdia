-- Imagen para redes por edición.
-- 1) Cifra destacada opcional de la nota principal (la tarjeta "100+").
--    Si queda vacía, la imagen sale solo con el titular.
ALTER TABLE editions ADD COLUMN stat_value TEXT;
ALTER TABLE editions ADD COLUMN stat_caption_es TEXT;
ALTER TABLE editions ADD COLUMN stat_caption_en TEXT;

-- 2) PNG ya dibujados, para dibujar cada imagen una sola vez.
CREATE TABLE IF NOT EXISTS og_images (
  date TEXT NOT NULL,
  version TEXT NOT NULL,
  png BLOB NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (date, version)
);
