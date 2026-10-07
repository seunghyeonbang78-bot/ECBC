'use client';

import { useState } from 'react';
import OwnerCalendar from './owner-calendar';
import { useClub } from '../use-club';
import { dateLabel, today } from '@/lib/club-types';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Checkbox,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel
} from '@/components/ui';

const newEvent = (date = today()) => ({
  title: '',
  date,
  start: '19:00',
  end: '21:00',
  location: '',
  description: '',
  category: 'Open gym',
  cancelled: 0,
  repeat: 1
});

const newPost = () => ({
  title: '',
  body: '',
  date: today(),
  status: 'draft',
  pinned: 0
});

function Choice({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {options.map(option => (
        <option value={option} key={option}>{option}</option>
      ))}
    </select>
  );
}

export default function Admin({ name }: { name: string }) {
  const { events, posts, loading, error, load } = useClub(true);

  const [kind, setKind] = useState('events');
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState<any>(null);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [queued, setQueued] = useState<(() => void) | null>(null);

  function guard(action: () => void) {
    if (saving) return;

    if (dirty) {
      setQueued(() => action);
      setDiscard(true);
    } else {
      action();
    }
  }

  function open(
    row: any = null,
    selectedKind = kind,
    date = today()
  ) {
    guard(() => {
      setKind(selectedKind);
      setEdit(row);

      setForm(
        row
          ? { ...row, repeat: 1 }
          : selectedKind === 'events'
            ? newEvent(date)
            : newPost()
      );

      setSaveError('');
      setMessage('');
      setPreview(false);
      setDirty(false);
    });
  }

  function change(key: string, value: any) {
    setForm({ ...form, [key]: value });
    setDirty(true);
  }

  async function write(operation: string, row: any = edit) {
    setSaving(true);
    setSaveError('');
    setMessage('');

    try {
      const response = await fetch('/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          op: operation,
          id: row?.id,
          version: row?.version,
          data: form
        })
      });

      const result: any = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setMessage(
        operation === 'delete'
          ? 'Entry deleted.'
          : kind === 'posts' && form.status === 'draft'
            ? 'Draft saved. Only you can see it.'
            : 'Saved. Your changes are now visible on the club website.'
      );

      if (kind === 'events' && operation !== 'delete') {
        setMonth(form.date.slice(0, 7));
      }

      setDirty(false);
      setForm(null);
      setEdit(null);
      setDeleting(null);

      await load();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">OWNER WORKSPACE</span>
          <h1>Your club calendar.</h1>
          <p>
            Welcome, {name}. Choose a day to keep your club up to date.
          </p>
        </div>

        <form action="/api/owner/logout" method="post">
          <button className="outline-button" type="submit">
            Sign out
          </button>
        </form>
      </div>

      {message && (
        <p className="success-box" role="status">{message}</p>
      )}

      <Tabs
        value={kind}
        onValueChange={value => guard(() => {
          setKind(value);
          setForm(null);
          setEdit(null);
          setDirty(false);
          setSaveError('');
        })}
      >
        <TabsList className="admin-tabs">
          <TabsTrigger value="events">Calendar</TabsTrigger>
          <TabsTrigger value="posts">News & updates</TabsTrigger>
        </TabsList>

        {['events', 'posts'].map(selectedKind => (
          <TabsContent value={selectedKind} key={selectedKind}>
            <div className="admin-toolbar">
              <div>
                <h2>
                  {selectedKind === 'events'
                    ? 'Manage calendar'
                    : 'Manage announcements'}
                </h2>

                <p>
                  {selectedKind === 'events'
                    ? 'Your schedule at a glance. Add sessions and update events directly on the calendar.'
                    : 'News is separate from the Calendar. Edit an imported announcement below, or write a new update.'}
                </p>
              </div>

              <div className="toolbar-actions">
                <a
                  href={selectedKind === 'events' ? '/calendar' : '/news'}
                  target="_blank"
                  rel="noopener"
                  className="outline-button"
                >
                  View page
                </a>

                <button
                  className="button dark"
                  disabled={saving}
                  onClick={() => open(
                    null,
                    selectedKind,
                    month === today().slice(0, 7)
                      ? today()
                      : month + '-01'
                  )}
                >
                  {selectedKind === 'events'
                    ? '+ Add event'
                    : '+ Write update'}
                </button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {kind === 'events' && !loading && !error && (
        <OwnerCalendar
          events={events}
          month={month}
          onMonth={setMonth}
          onCreate={date => open(null, 'events', date)}
          onEdit={row => open(row, 'events')}
          disabled={saving}
        />
      )}

      <Dialog
        open={!!form}
        onOpenChange={value => {
          if (!value) {
            guard(() => {
              setForm(null);
              setDirty(false);
            });
          }
        }}
      >
        <DialogContent
          className="owner-editor"
          showCloseButton={false}
        >
          {form && (
            <section className="editor-panel">
              <div className="editor-heading">
                <div>
                  <DialogTitle>
                    {edit ? 'Edit' : 'New'}{' '}
                    {kind === 'events' ? 'event' : 'update'}
                  </DialogTitle>

                  <DialogDescription>
                    {kind === 'events'
                      ? dateLabel(form.date) + ' · Eastern Time'
                      : 'Write a club announcement.'}
                  </DialogDescription>
                </div>

                <button
                  className="outline-button"
                  disabled={saving}
                  onClick={() => guard(() => {
                    setForm(null);
                    setDirty(false);
                  })}
                >
                  Close editor
                </button>
              </div>

              <form
                onSubmit={event => {
                  event.preventDefault();
                  write(edit ? 'update' : 'create');
                }}
              >
                <div className="editor-grid">
                  <label className="full-field">
                    Title
                    <input
                      required
                      maxLength={kind === 'events' ? 120 : 180}
                      value={form.title}
                      onChange={event => change('title', event.target.value)}
                      placeholder={
                        kind === 'events'
                          ? 'Sunday open gym'
                          : 'A new update for the club'
                      }
                    />
                  </label>

                  <label>
                    Date
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={event => change('date', event.target.value)}
                    />
                  </label>

                  {kind === 'events' ? (
                    <>
                      <label>
                        Session type
                        <Choice
                          value={form.category}
                          onChange={value => change('category', value)}
                          options={[
                            'Open gym',
                            'Group training',
                            'Private coaching',
                            'Tournament',
                            'Closure'
                          ]}
                        />
                      </label>

                      <label>
                        Start time (Eastern)
                        <input
                          required
                          type="time"
                          value={form.start}
                          onChange={event => change('start', event.target.value)}
                        />
                      </label>

                      <label>
                        End time (Eastern)
                        <input
                          required
                          type="time"
                          value={form.end}
                          onChange={event => change('end', event.target.value)}
                        />
                      </label>

                      <label className="full-field">
                        Location
                        <input
                          required
                          maxLength={200}
                          value={form.location}
                          onChange={event => change('location', event.target.value)}
                          placeholder="School or venue name and address"
                        />
                      </label>

                      <label className="full-field">
                        Details
                        <textarea
                          rows={4}
                          maxLength={5000}
                          value={form.description}
                          onChange={event => change('description', event.target.value)}
                          placeholder="Fees, equipment, arrival instructions…"
                        />
                      </label>

                      {!edit && (
                        <label>
                          Create weekly sessions
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={form.repeat}
                            onChange={event => change(
                              'repeat',
                              Number(event.target.value)
                            )}
                          />
                          <small>
                            1 = this date only. Up to 12 weekly dates,
                            each editable separately.
                          </small>
                        </label>
                      )}

                      <label className="check-label">
                        <Checkbox
                          checked={!!form.cancelled}
                          onCheckedChange={value => change(
                            'cancelled',
                            value ? 1 : 0
                          )}
                        />
                        Mark as cancelled
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Visibility
                        <Choice
                          value={form.status}
                          onChange={value => change('status', value)}
                          options={['draft', 'published']}
                        />
                      </label>

                      <label className="full-field">
                        Your update
                        <textarea
                          rows={12}
                          required
                          maxLength={20000}
                          value={form.body}
                          onChange={event => change('body', event.target.value)}
                          placeholder="Write your announcement here…"
                        />
                        <small>
                          Line breaks are preserved. The date is a display date;
                          publishing makes the update visible immediately.
                        </small>
                      </label>

                      <label className="check-label">
                        <Checkbox
                          checked={!!form.pinned}
                          onCheckedChange={value => change(
                            'pinned',
                            value ? 1 : 0
                          )}
                        />
                        Pin to the top of the news page
                      </label>
                    </>
                  )}
                </div>

                {saveError && (
                  <p className="error-box" role="alert">
                    {saveError}
                  </p>
                )}

                <div className="editor-actions">
                  <button
                    type="submit"
                    className="button dark"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving…'
                      : kind === 'events'
                        ? 'Save event'
                        : form.status === 'draft'
                          ? 'Save draft'
                          : 'Publish update'}
                  </button>

                  {kind === 'posts' && (
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => setPreview(!preview)}
                    >
                      {preview ? 'Hide preview' : 'Preview update'}
                    </button>
                  )}

                  {edit && (
                    <button
                      type="button"
                      className="delete-button"
                      disabled={saving}
                      onClick={() => {
                        setSaveError('');
                        setDeleting(edit);
                      }}
                    >
                      Delete {kind === 'events' ? 'event' : 'update'}
                    </button>
                  )}

                  <span className="fineprint">
                    {dirty ? 'Unsaved changes' : ''}
                  </span>
                </div>

                {preview && (
                  <article className="news-article editor-preview">
                    <span className="eyebrow">PREVIEW</span>
                    <h2>{form.title || 'Your title'}</h2>
                    <p className="preserve-lines">
                      {form.body || 'Your announcement will appear here.'}
                    </p>
                  </article>
                )}
              </form>
            </section>
          )}
        </DialogContent>
      </Dialog>

      {error ? (
        <div role="alert" className="error-box">
          {error}
          <button onClick={load}>Reload entries</button>
        </div>
      ) : loading ? (
        <p role="status">Loading your entries…</p>
      ) : kind === 'posts' ? (
        <div className="admin-entries">
          {posts.length === 0 ? (
            <div className="empty-state">
              <h3>Your next announcement starts here.</h3>
              <p>
                Write an update and save a draft or publish it immediately.
              </p>
              <button className="button dark" onClick={() => open()}>
                Write first update
              </button>
            </div>
          ) : posts.map(row => (
            <article className="admin-row" key={row.id}>
              <div>
                <div className="row-meta">
                  {dateLabel(row.date)}

                  {row.id.startsWith('archive-') && (
                    <span className="tag">Imported news</span>
                  )}

                  <span className="tag">{row.status}</span>

                  {!!row.pinned && (
                    <span className="tag">Pinned</span>
                  )}
                </div>

                <h3>{row.title}</h3>

                <p>
                  {row.body.slice(0, 130)}
                  {row.body.length > 130 ? '…' : ''}
                </p>
              </div>

              <div className="row-actions">
                <button
                  disabled={saving}
                  className="outline-button"
                  onClick={() => open(row)}
                >
                  Edit
                </button>

                <button
                  disabled={saving}
                  className="delete-button"
                  onClick={() => {
                    setSaveError('');
                    setDeleting(row);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <AlertDialog
        open={!!deleting}
        onOpenChange={value => {
          if (!saving && !value) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete this {kind === 'events' ? 'event' : 'update'}?
          </AlertDialogTitle>

          <AlertDialogDescription>
            “{deleting?.title}” will be removed from the club website.
            This cannot be undone.
          </AlertDialogDescription>

          {saveError && (
            <p role="alert" className="error-box">{saveError}</p>
          )}

          <div className="editor-actions">
            <AlertDialogCancel disabled={saving}>
              Keep it
            </AlertDialogCancel>

            <button
              disabled={saving}
              className="button danger"
              onClick={() => write('delete', deleting)}
            >
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={discard}
        onOpenChange={setDiscard}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Discard unsaved changes?
          </AlertDialogTitle>

          <AlertDialogDescription>
            Your current edits have not been saved.
          </AlertDialogDescription>

          <div className="editor-actions">
            <AlertDialogCancel>Keep editing</AlertDialogCancel>

            <button
              className="button danger"
              onClick={() => {
                setDiscard(false);
                setDirty(false);
                queued?.();
                setQueued(null);
              }}
            >
              Discard changes
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
