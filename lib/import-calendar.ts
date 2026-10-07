import { clubDb } from './club-db';

const IMPORT_ID = 'ecbc-october-2026-user-schedule-v1';

export const importedSessions = [
  ['2026-10-05', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-06', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-07', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-08', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-09', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-10', '17:30', '20:30', 'Quince Orchard HS'],
  ['2026-10-11', '14:00', '17:00', 'Churchill HS'],
  ['2026-10-12', '19:30', '22:00', 'Seneca Valley HS'],
  ['2026-10-13', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-14', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-15', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-17', '17:30', '20:30', 'Churchill HS'],
  ['2026-10-18', '14:00', '17:00', 'Churchill HS'],
  ['2026-10-19', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-20', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-21', '19:30', '22:00', 'Kingsview MS'],
  ['2026-10-22', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-23', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-24', '17:30', '20:30', 'Churchill HS'],
  ['2026-10-25', '14:00', '17:00', 'Churchill HS'],
  ['2026-10-26', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-27', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-28', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-29', '19:30', '22:00', 'Gaithersburg HS'],
  ['2026-10-30', '19:30', '22:00', 'Quince Orchard HS'],
  ['2026-10-31', '17:30', '20:30', 'Churchill HS'],
  ['2026-11-01', '14:00', '17:00', 'Churchill HS']
];

export async function ensureUserCalendar() {
  const db = clubDb();

  const imported = await db
    .prepare('SELECT id FROM content_imports WHERE id = ?')
    .bind(IMPORT_ID)
    .first();

  if (imported) return;

  const statements = importedSessions.map(
    ([date, start, end, location]) =>
      db.prepare(
        "INSERT OR IGNORE INTO events " +
        "(id,title,date,start,end,location,description,category,cancelled,version) " +
        "SELECT ?,?,?,?,?,?,'','Open gym',0,1 " +
        "WHERE NOT EXISTS " +
        "(SELECT 1 FROM content_imports WHERE id = ?) " +
        "AND NOT EXISTS " +
        "(SELECT 1 FROM events WHERE date = ? AND start = ? " +
        "AND location = ? AND category = 'Open gym')"
      ).bind(
        'ecbc-user-' + date,
        'ECBC OPEN GYM @ ' + location,
        date,
        start,
        end,
        location,
        IMPORT_ID,
        date,
        start,
        location
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
