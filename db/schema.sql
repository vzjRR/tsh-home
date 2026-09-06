-- tsh87.com — storage for the contact form and the newsletter.
--
-- Applied to the D1 database bound as `DB`. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  topic       TEXT NOT NULL DEFAULT 'general',
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  -- The sender's address is never stored in the clear; only a salted hash,
  -- and only so repeated submissions can be rate-limited.
  ip_hash     TEXT,
  user_agent  TEXT,
  notified    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS messages_rate_idx ON messages (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS subscribers (
  email             TEXT PRIMARY KEY,
  created_at        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
  unsubscribed_at   TEXT,
  -- Minted at sign-up so an unsubscribe link can be honoured without an
  -- account or a login.
  unsubscribe_token TEXT NOT NULL,
  source            TEXT,
  ip_hash           TEXT
);

CREATE INDEX IF NOT EXISTS subscribers_created_at_idx ON subscribers (created_at DESC);
CREATE INDEX IF NOT EXISTS subscribers_rate_idx ON subscribers (ip_hash, created_at);
