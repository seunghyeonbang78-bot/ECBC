CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  category TEXT DEFAULT 'Open gym' NOT NULL,
  cancelled INTEGER DEFAULT 0 NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL
);

CREATE INDEX events_date_idx ON events (date);

CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  pinned INTEGER DEFAULT 0 NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL
);

CREATE INDEX posts_status_date_idx ON posts (status, date);

CREATE TABLE content_imports (
  id TEXT PRIMARY KEY NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE TABLE login_attempts (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE TABLE owner_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL
);
