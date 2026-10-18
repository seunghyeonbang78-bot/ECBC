'use client';
import { useCallback, useEffect, useState } from 'react';
type State = {
  configured: boolean;
  connection: null | { email: string; calendarId: string | null; calendarName: string | null; syncedAt: number; error: string | null };
};
export default function GoogleCalendar({ onSynced }: { onSynced: () => unknown }) {
  const [data, setData] = useState<State | null>(null);
  const [calendars, setCalendars] = useState<{id: string; summary: string}[]>([]);
  const [selected, setSelected] = useState('');
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async (list = false) => {
    const response = await fetch('/api/google/calendar' + (list ? '?list=1' : ''), { cache: 'no-store' });
    const result: any = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load Google Calendar.');
    setData(result);
    if (list) { setCalendars(result.calendars); setSelected(result.connection?.calendarId || ''); setPublish(false); }
  }, []);
  useEffect(() => {
    load().catch(e => setError(e.message));
    const status = new URLSearchParams(window.location.search).get('google');
    if (status === 'connected') setNotice('Google connected. Choose a calendar to publish below.');
    if (status === 'failed') setError('Google connection did not finish. Try again and allow both Calendar permissions.');
    if (status === 'setup') setError('Google setup is incomplete or this website address does not match the configured address.');
    const timer = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(name: string) {
    if (name === 'disconnect' && !window.confirm('Disconnect this Google account and remove its synced events from ECBC? Events in Google Calendar will stay.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/google/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, calendarId: selected, publish }) });
      const result: any = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update the connection.');
      setNotice(name === 'disconnect' ? 'Google disconnected.' : 'Calendar saved. Google changes are checked every minute.');
      if (name !== 'sync') setCalendars([]);
      await load(); onSynced();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="google-connection" aria-label="Google Calendar connection">
    <h2>Google Calendar</h2>
    <p>Connect your Google account, then choose a club calendar. Its events will appear in the ECBC calendar automatically.</p>
    {error && <p role="alert" className="error-box">{error} <button type="button" onClick={() => { setError(''); load().catch(e => setError(e.message)); }}>Retry</button></p>}
    {notice && <p role="status" className="success-box">{notice}</p>}
    {!data ? <p>Loading connection…</p> : !data.configured ? <p>Google Calendar is not set up yet. The site administrator needs to complete the Google setup.</p> : <>
      <div className="toolbar-actions">
        <form action="/api/google/connect" method="post"><button className="outline-button" disabled={busy}>{data.connection ? 'Connect / switch Google account' : 'Connect Google Calendar'}</button></form>
        <a className="outline-button" href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a>
      </div>
      {data.connection && <>
        <p><strong>{data.connection.email}</strong><br />Calendar: {data.connection.calendarName || 'Not selected'}</p>
        {data.connection.syncedAt > 0 && <p className="fineprint">Last synced: {new Date(data.connection.syncedAt).toLocaleString()}</p>}
        {data.connection.error && <p className="error-box" role="alert">{data.connection.error}</p>}
        <div className="toolbar-actions">
          <button className="outline-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await load(true); } catch(e) { setError(e instanceof Error ? e.message : 'Could not list calendars.'); } finally { setBusy(false); } }}>Choose calendar</button>
          {data.connection.calendarId && <button className="outline-button" disabled={busy} onClick={() => action('sync')}>Sync now</button>}
          <button className="delete-button" disabled={busy} onClick={() => action('disconnect')}>Disconnect Google</button>
        </div>
        {calendars.length > 0 && <div className="google-selection">
          <label>Calendar to show on ECBC<select className="form-select" value={selected} onChange={e => { setSelected(e.target.value); setPublish(false); }}><option value="">Select a calendar</option>{calendars.map(c => <option key={c.id} value={c.id}>{c.summary}</option>)}</select></label>
          <label className="check-label"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />Publish this calendar’s event titles, times, locations and descriptions on the public ECBC website. Events marked private are excluded.</label>
          <button className="button dark" disabled={busy || !selected || !publish} onClick={() => action('select')}>{busy ? 'Syncing…' : 'Connect selected calendar'}</button>
        </div>}
        <p className="fineprint">Use a dedicated ECBC calendar. Other owners can connect their own accounts; the same shared calendar is shown only once. Sync includes the past year and next two years. Edit Google events in Google Calendar.</p>
      </>}
    </>}
  </section>;
}
