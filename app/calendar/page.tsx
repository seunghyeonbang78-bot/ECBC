'use client';

import { useState } from 'react';
import { useClub } from '../use-club';

import {
  dateLabel,
  timeLabel,
  today,
  type ClubEvent
} from '@/lib/club-types';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui';

export default function Calendar() {
  const { events, loading, error, load } = useClub();

  const [month, setMonth] = useState(
    () => today().slice(0, 7)
  );

  const [selected, setSelected] = useState<ClubEvent | null>(null);

  const [year, number] = month.split('-').map(Number);
  const first = new Date(year, number - 1, 1).getDay();
  const days = new Date(year, number, 0).getDate();

  const list = events.filter(event => event.date.startsWith(month));

  function shift(offset: number) {
    const date = new Date(year, number - 1 + offset, 1);

    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );
  }

  return (
    <section className="section calendar-page">
      <div className="page-heading">
        <span className="eyebrow">LET’S PLAY</span>
        <h1>Club calendar</h1>
        <p>
          Open gym, training, and club events.
          All times are Eastern Time (Maryland).
        </p>
      </div>

      <div className="calendar-toolbar">
        <h2>
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
            Previous
          </button>

          <button
            className="outline-button"
            onClick={() => setMonth(today().slice(0, 7))}
          >
            This month
          </button>

          <button
            className="outline-button"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <p role="status">Loading the calendar…</p>
      ) : error ? (
        <div role="alert" className="error-box">
          {error}
          <button onClick={load}>Try again</button>
        </div>
      ) : (
        <>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div className="weekday" key={day}>{day}</div>
            ))}

            {Array.from({ length: first }, (_, index) => (
              <div
                className="calendar-cell blank"
                key={'blank' + index}
              />
            ))}

            {Array.from({ length: days }, (_, index) => {
              const date =
                `${month}-${String(index + 1).padStart(2, '0')}`;

              return (
                <div
                  key={date}
                  className={
                    'calendar-cell ' +
                    (date === today() ? 'is-today' : '')
                  }
                >
                  <span className="day-number">{index + 1}</span>

                  {list.filter(event => event.date === date).map(event => (
                    <button
                      key={event.id}
                      className={
                        'calendar-event ' +
                        (event.cancelled ? 'cancelled' : '')
                      }
                      onClick={() => setSelected(event)}
                    >
                      <span>{timeLabel(event.start)}</span>
                      <strong>
                        {event.cancelled ? 'Cancelled · ' : ''}
                        {event.title}
                      </strong>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="calendar-list">
            <h3>Sessions this month</h3>

            {!list.length ? (
              <div className="empty-state">
                <h3>No sessions posted for this month.</h3>
                <p>
                  Check another month, or contact the club for availability.
                </p>
                <a href="tel:+12023908988">Call (202) 390-8988</a>
              </div>
            ) : list.map(event => (
              <button
                className="event-list-row"
                key={event.id}
                onClick={() => setSelected(event)}
              >
                <span>
                  {dateLabel(event.date)}
                  <small>
                    {timeLabel(event.start)} – {timeLabel(event.end)}
                  </small>
                </span>

                <strong>
                  {event.title}
                  <small>{event.location}</small>
                </strong>

                <span className="tag">
                  {event.cancelled ? 'Cancelled' : event.category}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={value => !value && setSelected(null)}
      >
        <DialogContent className="club-dialog">
          <DialogTitle>{selected?.title}</DialogTitle>

          <DialogDescription>
            {selected && dateLabel(selected.date)} · Eastern Time
          </DialogDescription>

          {selected && (
            <div>
              <span className="tag">
                {selected.cancelled ? 'Cancelled' : selected.category}
              </span>

              <p>
                {timeLabel(selected.start)} – {timeLabel(selected.end)}
                <br />
                <strong>{selected.location}</strong>
              </p>

              <p className="preserve-lines">
                {selected.description}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
