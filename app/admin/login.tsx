'use client';

import { useState, type FormEvent } from 'react';

export default function Login() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/owner/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json() as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Unable to sign in.');
      }

      window.location.assign('/admin');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to sign in.'
      );

      setBusy(false);
    }
  }

  return (
    <section className="section login-page">
      <span className="eyebrow">CLUB MANAGEMENT</span>
      <h1>Owner login.</h1>
      <p>
        Enter your administrator code to edit the calendar and club news.
      </p>

      <form
        onSubmit={submit}
        style={{
          maxWidth: 440,
          display: 'grid',
          gap: 16,
          marginTop: 24
        }}
      >
        <label htmlFor="owner-code">Administrator code</label>

        <input
          id="owner-code"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={code}
          onChange={event => setCode(event.target.value)}
          disabled={busy}
          style={{
            padding: '14px 16px',
            border: '1px solid #9daea6',
            borderRadius: 8,
            fontSize: 16
          }}
        />

        {error && (
          <p className="error-box" role="alert">{error}</p>
        )}

        <button className="button dark" disabled={busy}>
          {busy ? 'Checking…' : 'Enter editor mode'}
        </button>
      </form>

      <p className="fineprint">
        Your editor session lasts 8 hours. Keep your code private.
      </p>
    </section>
  );
}
