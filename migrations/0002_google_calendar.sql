CREATE TABLE google_connections (
  subject TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  snapshot TEXT NOT NULL DEFAULT '[]',
  synced_at INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE google_owner_links (
  session_hash TEXT PRIMARY KEY REFERENCES owner_sessions(token_hash) ON DELETE CASCADE,
  subject TEXT NOT NULL REFERENCES google_connections(subject) ON DELETE CASCADE
);
CREATE TABLE google_oauth_states (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  session_hash TEXT NOT NULL REFERENCES owner_sessions(token_hash) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
