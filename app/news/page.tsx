'use client';

import { useEffect } from 'react';
import { SEEN_NEWS_KEY } from '../news-indicator';
import { useClub } from '../use-club';
import { dateLabel } from '@/lib/club-types';

export default function News() {
  const { posts, loading, error, load } = useClub();

  useEffect(() => {
    if (loading || error) return;

    try {
      localStorage.setItem(
        SEEN_NEWS_KEY,
        JSON.stringify(
          posts.map(post => `${post.id}:${post.version}`)
        )
      );

      window.dispatchEvent(new Event('ecbc-news-read'));
    } catch {}
  }, [posts, loading, error]);

  return (
    <section className="section news-page">
      <div className="page-heading">
        <span className="eyebrow">FROM THE CLUB</span>
        <h1>News & updates</h1>
        <p>
          Club announcements and updates.
          For session dates and times, visit the Calendar.
        </p>
      </div>

      {loading ? (
        <p role="status">Loading club news…</p>
      ) : error ? (
        <div className="error-box" role="alert">
          {error}
          <button onClick={load}>Try again</button>
        </div>
      ) : !posts.length ? (
        <div className="empty-state">
          <h3>No announcements yet.</h3>
          <p>
            Club updates will appear here when the owner publishes them.
          </p>
          <a className="button dark" href="/calendar">
            Explore the calendar
          </a>
        </div>
      ) : posts.map(post => (
        <article
          className="news-article"
          key={post.id}
          id={post.id}
        >
          <div className="news-meta">
            <time>{dateLabel(post.date)}</time>

            {post.id.startsWith('archive-') && (
              <span className="tag">Club archive</span>
            )}

            {!!post.pinned && (
              <span className="tag">Pinned update</span>
            )}
          </div>

          <h2>{post.title}</h2>
          <p className="preserve-lines">{post.body}</p>

          {post.id.startsWith('archive-') && (
            <p className="archive-note">
              Summary of an original ECBC announcement.
              Dates describe a past program; check the Calendar for current sessions.
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
