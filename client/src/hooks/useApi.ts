import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Standard fetch-once-then-render pattern used across views (ClientsView,
 * DepositsView, ContractsView). Centralised here so views just declare
 * "what data, what dependencies" — the loading/error/data plumbing is
 * uniform.
 *
 * - `loading` is true on first fetch only. `reload()` keeps existing data
 *   visible (avoids flicker on mutate-then-reload).
 * - Cancels any in-flight fetch when deps change or the component unmounts
 *   so a persona switch mid-fetch can't resolve stale-tenant data into the
 *   new tenant's view.
 * - Error coercion matches every wired view: the server error string from
 *   axios falls back to JS error.message falls back to a static fallback.
 */

const ERROR_FALLBACK = 'Request failed';

function coerceError(e: any, fallback: string): string {
  return e?.response?.data?.error ?? e?.message ?? fallback;
}

export interface UseApiResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Fetch a list resource. `data` defaults to `[]` so callers don't need
 * null-checks on `.map(...)`.
 *
 *   const { data: clients, loading, error, reload } = useApiList(
 *     () => api.clients.list(),
 *     [],
 *   );
 */
export function useApiList<T>(
  fetcher: () => Promise<T[]>,
  deps: React.DependencyList = [],
  errorFallback: string = ERROR_FALLBACK,
): UseApiResult<T[]> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track whether the FIRST fetch has completed; only first fetch flips
  // `loading` to true so reload() doesn't blank the rendered list.
  const firstFetchDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Stable fetcher ref — we don't want fetcher identity changes to
  // re-trigger; the caller's `deps` is the contract.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (!firstFetchDone.current) setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (ac.signal.aborted) return;
      setData(result);
    } catch (e: any) {
      if (ac.signal.aborted) return;
      setError(coerceError(e, errorFallback));
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
        firstFetchDone.current = true;
      }
    }
  }, [errorFallback]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run };
}

/**
 * Fetch a single resource (object). `data` is `null` until first load.
 *
 *   const { data: profile, loading, error } = useApiResource(
 *     () => api.auth.me(),
 *     [],
 *   );
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  errorFallback: string = ERROR_FALLBACK,
): UseApiResult<T | null> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstFetchDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (!firstFetchDone.current) setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (ac.signal.aborted) return;
      setData(result);
    } catch (e: any) {
      if (ac.signal.aborted) return;
      setError(coerceError(e, errorFallback));
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
        firstFetchDone.current = true;
      }
    }
  }, [errorFallback]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run };
}

export { coerceError };
