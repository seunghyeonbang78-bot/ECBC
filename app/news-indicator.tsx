'use client';

import { useEffect, useState } from 'react';

export const SEEN_NEWS_KEY = 'ecbc-seen-news-v1';

export default function NewsIndicator() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let posts: { id: string; version: number }[] = [];

    function recalculate() {
      let seen: string[] = [];

      try {
        seen = JSON.parse(
          localStorage.getItem(SEEN_NEWS_KEY) || '[]'
        );

        if (!Array.isArray(seen)) seen = [];
      } catch {}

      if (!cancelled) {
        setUnread(
          posts.filter(post =>
            (!post.id.startsWith('archive-') || post.version > 1) &&
            !seen.includes(`${post.id}:${post.version}`)
          ).length
        );
      }
    }

    async function refresh() {
      if (document.hidden) return;

      try {
        const response = await fetch('/api/club', {
          cache: 'no-store'
        });

        if (!response.ok) return;

        const data: any = await response.json();

        if (cancelled) return;

        posts = data.posts || [];
        recalculate();
      } catch {}
    }

    refresh();

    const timer = setInterval(refresh, 60000);

    window.addEventListener('storage', recalculate);
    window.addEventListener('ecbc-news-read', recalculate);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('storage', recalculate);
      window.removeEventListener('ecbc-news-read', recalculate);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return unread ? (
    <span
      className="news-alert"
      role="status"
      title={`${unread} unread news update${unread === 1 ? '' : 's'}`}
    >
      <span aria-hidden="true">!</span>
      <span className="sr-only">
        {unread} unread news updates
      </span>
    </span>
  ) : null;
}
