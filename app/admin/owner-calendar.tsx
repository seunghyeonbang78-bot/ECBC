'use client';

import {
  dateLabel,
  timeLabel,
  today,
  type ClubEvent
} from '@/lib/club-types';

type Props = {
  events: ClubEvent[];
  month: string;
  onMonth: (month: string) => void;
  onCreate: (date: string) => void;
  onEdit: (event: ClubEvent) => void;
  disabled: boolean;
};

export default function OwnerCalendar({
  events,
  month,
  onMonth,
  onCreate,
  onEdit,
  disabled
}: Props) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(year, number - 1, 1).getDay();
  const days = new Date(year, number, 0).getDate();
  const count = Math.ceil((first + days) / 7) * 7;
  const current = today();

  function shift(offset: number) {
    const date = new Date(year, number - 1 + offset, 1);

    onMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );
  }

  return (
    <section
      className="owner-calendar"
      aria-label="Edit club calendar"
    >
      <div className="calendar-toolbar">
        <h2 aria-live="polite">
          {new Date(year, number - 1, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}
        </h2>

        <div>
          <button
            className="outline-button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            ←
          </button>

          <button
            className="outline-button"
            onClick={() => onMonth(current.slice(0, 7))}
          >
            This month
          </button>

          <button
            className="outline-button"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <p className="owner-calendar-help">
        Click a date to add a session.
        Click an event to edit it.
        All times are Eastern.
      </p>

      <div className="owner-calendar-scroll">
        <div className="calendar-grid owner-calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div className="weekday" key={day}>{day}</div>
          ))}

          {Array.from({ length: count }, (_, index) => {
            const day = index - first + 1;

            if (day < 1 || day > days) {
              return (
                <div
                  className="calendar-cell blank"
                  key={'blank' + index}
                  aria-hidden="true"
                />
              );
            }

            const date = `${month}-${String(day).padStart(2, '0')}`;

            const entries = events
              .filter(event => event.date === date)
              .sort((a, b) => a.start.localeCompare(b.start));

            return (
              <div
                className={
                  'calendar-cell owner-day ' +
                  (date === current ? 'is-today' : '')
                }
                key={date}
              >
                <button
                  className="owner-add-day"
                  disabled={disabled}
                  onClick={() => onCreate(date)}
                  aria-label={`Add event on ${dateLabel(date)}`}
                  aria-current={date === current ? 'date' : undefined}
                >
                  <span className="day-number">{day}</span>
                  <span className="day-plus" aria-hidden="true">+</span>
                </button>

                {entries.map(event => (
                  <button
                    key={event.id}
                    disabled={disabled}
                    className={
                      'calendar-event ' +
                      (event.cancelled ? 'cancelled' : '')
                    }
                    onClick={() => onEdit(event)}
                    aria-label={
                      `Edit ${event.title}, ${dateLabel(date)}, ` +
                      `${timeLabel(event.start)}` +
                      (event.cancelled ? ', cancelled' : '')
                    }
                  >
                    <span>
                      {timeLabel(event.start)} – {timeLabel(event.end)}
                    </span>

                    <strong>
                      {event.cancelled ? 'Cancelled · ' : ''}
                      {event.title}
                    </strong>

                    <span>{event.location}</span>
                  </button>
                ))}

                <button
                  className="owner-day-space"
                  disabled={disabled}
                  onClick={() => onCreate(date)}
                  tabIndex={-1}
                  aria-label={`Add event on ${dateLabel(date)}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="fineprint">
        New sessions appear on the club calendar after you save.
      </p>
    </section>
  );
}
