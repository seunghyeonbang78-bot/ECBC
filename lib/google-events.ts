import type { ClubEvent } from './club-types';

export type GoogleEvent = {
  id: string; status?: string; summary?: string; description?: string;
  location?: string; htmlLink?: string; visibility?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
const zone = 'America/New_York';
function local(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(value));
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return { date: get('year') + '-' + get('month') + '-' + get('day'), time: get('hour') + ':' + get('minute') };
}
function nextDay(day: string) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function googleEventRows(calendarKey: string, event: GoogleEvent, min: string, max: string): ClubEvent[] {
  // Explicitly private events never become public club entries.
  if (event.status === 'cancelled' || event.visibility === 'private' || !event.start || !event.end) return [];
  const allDay = !!event.start.date;
  const start = allDay ? { date: event.start.date!, time: '00:00' } : local(event.start.dateTime!);
  const end = allDay ? { date: event.end.date!, time: '00:00' } : local(event.end.dateTime!);
  const rows: ClubEvent[] = [];
  for (let date = start.date < min ? min : start.date; date <= end.date && date < max; date = nextDay(date)) {
    if (date === end.date && end.time === '00:00') break;
    rows.push({
      id: 'google:' + calendarKey + ':' + event.id + ':' + date,
      title: event.summary || 'Untitled event', date,
      start: date === start.date ? start.time : '00:00',
      end: date === end.date ? end.time : '24:00',
      location: event.location || '', description: event.description || '',
      category: 'Google Calendar', cancelled: 0, version: 1, allDay,
      source: 'google',
      googleUrl: event.htmlLink?.startsWith('https://www.google.com/calendar/') || event.htmlLink?.startsWith('https://calendar.google.com/')
        ? event.htmlLink : 'https://calendar.google.com/'
    });
  }
  return rows;
}
