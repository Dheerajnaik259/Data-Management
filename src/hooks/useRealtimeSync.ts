import { useEffect, useState } from 'react';
import { Unsubscribe } from '../supabase/data';

/**
 * Reusable custom hook for real-time subscriptions.
 * @param subscriberFn - The subscription function returning an Unsubscribe callback
 * @param deps - Dependency array for re-subscribing
 */
export function useRealtimeSync<T>(
  subscriberFn: (callback: (data: T) => void) => Unsubscribe,
  initialValue: T,
  deps: unknown[] = []
): { data: T; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribe: Unsubscribe;
    try {
      unsubscribe = subscriberFn((newData) => {
        setData(newData);
        setLoading(false);
      });
    } catch (err) {
      console.error('Realtime sync subscription error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
