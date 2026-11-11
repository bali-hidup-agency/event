-- One row per guest; id is "p" + the WhatsApp number's digits, so a second reply from the same number updates the first.
CREATE TABLE IF NOT EXISTS guests (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  guests      INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL CHECK (status IN ('yes', 'no')),
  note        TEXT NOT NULL DEFAULT '',
  lang        TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'invitation',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
