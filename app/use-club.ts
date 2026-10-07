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

  const load = useCallback(async () => {
    setError('');
    setLoading(true);

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
      return true;
    } catch (error) {
      setError(
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
  }, [load]);

  return { ...data, loading, error, load };
}
