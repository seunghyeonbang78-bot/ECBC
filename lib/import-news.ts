import { clubDb } from './club-db';
import { originalNews } from './original-news';

const IMPORT_ID = 'ecbc-original-news-v1';

export async function ensureOriginalNews() {
  const db = clubDb();

  const imported = await db
    .prepare('SELECT id FROM content_imports WHERE id = ?')
    .bind(IMPORT_ID)
    .first();

  if (imported) return;

  const statements = originalNews.map(post =>
    db.prepare(
      "INSERT OR IGNORE INTO posts " +
      "(id,title,body,date,status,pinned,version) " +
      "SELECT ?,?,?,?,'published',0,1 " +
      "WHERE NOT EXISTS " +
      "(SELECT 1 FROM content_imports WHERE id = ?)"
    ).bind(
      post.id,
      post.title,
      post.body,
      post.date,
      IMPORT_ID
    )
  );

  statements.push(
    db.prepare(
      'INSERT OR IGNORE INTO content_imports ' +
      '(id,imported_at) VALUES (?,?)'
    ).bind(IMPORT_ID, new Date().toISOString())
  );

  await db.batch(statements);
}
