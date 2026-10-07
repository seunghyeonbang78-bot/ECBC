export type ClubEvent = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  location: string;
  description: string;
  category: string;
  cancelled: number;
  version: number;
};

export type Post = {
  id: string;
  title: string;
  body: string;
  date: string;
  status: string;
  pinned: number;
  version: number;
};

export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

export const timeLabel = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);

  return (
    `${hour % 12 || 12}:` +
    `${String(minute).padStart(2, '0')} ` +
    `${hour < 12 ? 'AM' : 'PM'}`
  );
};
