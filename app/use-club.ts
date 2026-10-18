'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClubEvent, Post } from '@/lib/club-types';

export function useClub(admin = false) {
  const [data, setData] = useState<{
    events: ClubEvent[];
    posts: Post[];
  }>({
    events: [],
    posts: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setError(''); setLoading(true); }

    try {
      const response = await fetch(
        '/api/club' + (admin ? '?admin=1' : ''),
        { cache: 'no-store' }
      );

      const result: any = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setData(result);
      setError('');
      return true;
    } catch (error) {
      if (!quiet) setError(
        error instanceof Error
          ? error.message
          : 'Unable to load.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    load();
    const refresh = () => { if (!document.hidden) void load(true); };
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  return { ...data, loading, error, load: () => load() };
}
