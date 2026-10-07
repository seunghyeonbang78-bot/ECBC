'use client';

import { useClub } from './use-club';
import { dateLabel } from '@/lib/club-types';

export default function NewsPreview() {
  const { posts, loading, error, load } = useClub();

  return (
    <section className="section home-news">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FROM THE CLUB</span>
          <h2>News & updates</h2>
        </div>
        <a className="underlined" href="/news">
          Read all news
        </a>
      </div>

      {loading ? (
        <p role="status">Loading club news…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button className="outline-button" onClick={load}>
            Try again
          </button>
        </div>
      ) : posts.length ? (
        <div className="news-preview-grid">
          {posts.slice(0, 3).map(post => (
            <article className="news-preview-card" key={post.id}>
              <time>{dateLabel(post.date)}</time>

              {post.id.startsWith('archive-') && (
                <span className="tag">Archive</span>
              )}

              <h3>{post.title}</h3>

              <p>
                {post.body.slice(0, 170)}
                {post.body.length > 170 ? '…' : ''}
              </p>

              <a
                className="underlined"
                href={'/news#' + post.id}
              >
                Read announcement
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p>No published announcements yet.</p>
      )}
    </section>
  );
}
