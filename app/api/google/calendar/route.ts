import { ownerUser } from '@/lib/owner';
import { clubDb } from '@/lib/club-db';
import { calendarList, connectionFor, googleReady, syncConnection } from '@/lib/google-calendar';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
  const owner = await ownerUser();
  if (!owner) return reply({ error: 'Owner login required.' }, 403);
  if (!googleReady()) return reply({ configured: false, connection: null, calendars: [] });
  try {
    const connection = await connectionFor(owner.sessionHash);
    const calendars = connection && new URL(request.url).searchParams.get('list') === '1' ? await calendarList(connection) : [];
    return reply({ configured: true, calendars, connection: connection ? { email: connection.email, calendarId: connection.calendar_id, calendarName: connection.calendar_name, syncedAt: connection.synced_at, error: connection.error } : null });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Could not load Google Calendar.' }, 503); }
}
export async function POST(request: Request) {
  const owner = await ownerUser();
  if (!owner) return reply({ error: 'Owner login required.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Forbidden.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'JSON required.' }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return reply({ error: 'Request too large.' }, 413);
    const input = JSON.parse(raw);
    const connection = await connectionFor(owner.sessionHash);
    if (!connection) return reply({ error: 'Connect Google first.' }, 400);
    const db = clubDb();
    if (input.action === 'disconnect') {
      await db.prepare('DELETE FROM google_connections WHERE subject=?').bind(connection.subject).run();
      return reply({ ok: true });
    }
    if (input.action === 'select') {
      if (input.publish !== true) return reply({ error: 'Confirm publication to the club website.' }, 400);
      const calendar = (await calendarList(connection)).find(c => c.id === input.calendarId);
      if (!calendar) return reply({ error: 'Select a calendar from your Google account.' }, 400);
      await db.prepare("UPDATE google_connections SET calendar_id=?,calendar_name=?,snapshot='[]',synced_at=0,error=NULL,revision=revision+1,lease=NULL,lease_until=0 WHERE subject=?")
        .bind(calendar.id, calendar.summary, connection.subject).run();
    } else if (input.action !== 'sync') return reply({ error: 'Unknown action.' }, 400);
    // Rate-limit the manual retry; cron already runs every minute.
    if (input.action === 'sync' && connection.synced_at > Date.now() - 30000) return reply({ ok: true });
    await syncConnection(connection.subject);
    const latest = await connectionFor(owner.sessionHash);
    return latest?.error ? reply({ error: latest.error }, 503) : reply({ ok: true });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Could not update Google Calendar.' }, 503); }
}
