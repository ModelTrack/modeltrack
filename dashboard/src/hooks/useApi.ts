import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi<T>(url: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isFirstLoad: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnce = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      // API wraps responses in { data: ..., error: ... }
      if (json && typeof json === 'object' && 'data' in json) {
        setData(json.data);
      } else {
        setData(json);
      }
      hasFetchedOnce.current = true;
    } catch (err) {
      // Don't set error state for aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    fetchData();

    intervalRef.current = window.setInterval(fetchData, 30_000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const isFirstLoad = loading && !hasFetchedOnce.current;

  return { data, loading, error, refetch: fetchData, isFirstLoad };
}
