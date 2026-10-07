import { ensureUserCalendar } from '@/lib/import-calendar';
import { ensureOriginalNews } from '@/lib/import-news';
import { clubDb } from '@/lib/club-db';
import { ownerUser } from '@/lib/owner';
import { eventSchema, postSchema } from '@/lib/club-validation';

export const dynamic = 'force-dynamic';

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });

export async function GET(request: Request) {
  try {
    const admin =
      new URL(request.url).searchParams.get('admin') === '1';

    if (admin && !await ownerUser()) {
      return reply({ error: 'Owner access required.' }, 403);
    }

    await ensureOriginalNews();
    await ensureUserCalendar();

    const db = clubDb();

    const [events, posts] = await Promise.all([
      db.prepare(
        'SELECT * FROM events ORDER BY date,start'
      ).all(),

      db.prepare(
        admin
          ? 'SELECT * FROM posts ORDER BY pinned DESC,date DESC'
          : 'SELECT * FROM posts WHERE status = ? ORDER BY pinned DESC,date DESC'
      ).bind(...(admin ? [] : ['published'])).all()
    ]);

    return reply({
      events: events.results,
      posts: posts.results
    });
  } catch (error) {
    console.error('Club load failed', error);

    return reply({
      error: 'Could not load club information. Please try again.'
    }, 503);
  }
}

export async function POST(request: Request) {
  try {
    if (!await ownerUser()) {
      return reply({ error: 'Owner access required.' }, 403);
    }

    if (
      request.headers.get('origin') !==
      new URL(request.url).origin
    ) {
      return reply({ error: 'Request origin not allowed.' }, 403);
    }

    if (
      !request.headers.get('content-type')
        ?.includes('application/json')
    ) {
      return reply({ error: 'JSON required.' }, 415);
    }

    const raw = await request.text();

    if (raw.length > 30000) {
      return reply({ error: 'This entry is too long.' }, 413);
    }

    let input;

    try {
      input = JSON.parse(raw);
    } catch {
      return reply({ error: 'Invalid request.' }, 400);
    }

    const { kind, op, id, version } = input;

    if (
      !['events', 'posts'].includes(kind) ||
      !['create', 'update', 'delete'].includes(op)
    ) {
      return reply({ error: 'Invalid action.' }, 400);
    }

    if (
      op !== 'create' &&
      (typeof id !== 'string' || !Number.isInteger(version))
    ) {
      return reply({ error: 'Missing record version.' }, 400);
    }

    const db = clubDb();

    if (op === 'delete') {
      const result = await db.prepare(
        `DELETE FROM ${kind} WHERE id = ? AND version = ?`
      ).bind(id, version).run();

      return result.meta.changes
        ? reply({ ok: true })
        : reply({
            error: 'This entry changed. Reload before deleting.'
          }, 409);
    }

    const parsed = (
      kind === 'events' ? eventSchema : postSchema
    ).safeParse(input.data);

    if (!parsed.success) {
      return reply({
        error: parsed.error.issues
          .map(issue => issue.message)
          .join('. ')
      }, 400);
    }

    const data = parsed.data as Record<string, any>;

    const columns = kind === 'events'
      ? [
          'title',
          'date',
          'start',
          'end',
          'location',
          'description',
          'category',
          'cancelled'
        ]
      : ['title', 'body', 'date', 'status', 'pinned'];

    if (op === 'update') {
      const result = await db.prepare(
        `UPDATE ${kind} SET ` +
        columns.map(column => column + ' = ?').join(',') +
        ',version = version + 1 WHERE id = ? AND version = ?'
      ).bind(
        ...columns.map(column => data[column]),
        id,
        version
      ).run();

      return result.meta.changes
        ? reply({ ok: true })
        : reply({
            error:
              'This entry was changed in another window. ' +
              'Reload to get the latest version; your unsaved text is still here.'
          }, 409);
    }

    const count = kind === 'events' ? data.repeat : 1;

    const ids = Array.from(
      { length: count },
      () => crypto.randomUUID()
    );

    const statements = ids.map((newId, index) => {
      const values = { ...data };

      if (kind === 'events') {
        const date = new Date(data.date + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() + 7 * index);
        values.date = date.toISOString().slice(0, 10);
      }

      return db.prepare(
        `INSERT INTO ${kind} (id,${columns.join(',')}) ` +
        `VALUES (?,${columns.map(() => '?').join(',')})`
      ).bind(
        newId,
        ...columns.map(column => values[column])
      );
    });

    await db.batch(statements);

    return reply({ ok: true, ids }, 201);
  } catch (error) {
    console.error('Club save failed', error);

    return reply({
      error:
        'Could not save. Your changes are still in the form. Please try again.'
    }, 503);
  }
}
