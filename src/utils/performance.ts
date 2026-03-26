import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── measurePerformance ───────────────────────────────────────────────────────
export const measurePerformance = (name: string, fn: () => void): void => {
  const start = performance.now();
  fn();
  const end = performance.now();
  if (import.meta.env.DEV) console.log(`[perf] ${name} took ${(end - start).toFixed(2)}ms`);
};

// ─── debounce ─────────────────────────────────────────────────────────────────
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ─── throttle ─────────────────────────────────────────────────────────────────
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ─── useDebounce hook ─────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── useThrottle hook ─────────────────────────────────────────────────────────
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    return () => clearTimeout(handler);
  }, [value, limit]);
  return throttledValue;
}

// ─── TTL In-Memory Cache ──────────────────────────────────────────────────────
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function createCache<T>(defaultTTLms = 30_000) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
      return entry.value;
    },
    set(key: string, value: T, ttl = defaultTTLms): void {
      store.set(key, { value, expiresAt: Date.now() + ttl });
    },
    delete(key: string): void { store.delete(key); },
    clear(): void { store.clear(); },
    has(key: string): boolean {
      const entry = store.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) { store.delete(key); return false; }
      return true;
    },
  };
}

// ─── retryFetch — exponential backoff ─────────────────────────────────────────
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries = 3,
  baseDelayMs = 500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || attempt === retries) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('retryFetch: unreachable');
}

// ─── prefetchData ─────────────────────────────────────────────────────────────
const prefetchCache = createCache<Promise<any>>(60_000);

export function prefetchData(url: string, headers: HeadersInit = {}): void {
  if (prefetchCache.has(url)) return;
  const promise = fetch(url, { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  prefetchCache.set(url, promise);
}

export async function getPrefetched<T>(url: string, headers: HeadersInit = {}): Promise<T | null> {
  const cached = prefetchCache.get(url) as Promise<T> | null;
  if (cached) { prefetchCache.delete(url); return cached; }
  return fetch(url, { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null);
}

// ─── usePollInterval ──────────────────────────────────────────────────────────
interface UsePollOptions {
  intervalMs?: number;
  pauseOnHidden?: boolean;
  enabled?: boolean;
}

export function usePollInterval(
  callback: () => void | Promise<void>,
  { intervalMs = 30_000, pauseOnHidden = true, enabled = true }: UsePollOptions = {}
): { isPolling: boolean; lastPolledAt: Date | null } {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      if (pauseOnHidden && document.hidden) return;
      setIsPolling(true);
      try { await callbackRef.current(); } finally {
        setIsPolling(false);
        setLastPolledAt(new Date());
      }
    };

    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, pauseOnHidden, enabled]);

  return { isPolling, lastPolledAt };
}

// ─── lazyLoad ─────────────────────────────────────────────────────────────────
export const lazyLoad = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>
) => React.lazy(importFunc);

// ─── optimizeImage ────────────────────────────────────────────────────────────
export const optimizeImage = (
  file: File,
  maxWidth = 800,
  quality = 0.8
): Promise<Blob> =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => resolve(b!), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });

// ─── useCachedFetch — hook combining cache + retry + polling ──────────────────
interface UseCachedFetchOptions<T> {
  headers?: HeadersInit;
  ttlMs?: number;
  pollIntervalMs?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
}

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  refetch: () => Promise<void>;
}

const globalCache = createCache<any>(30_000);

export function useCachedFetch<T>(
  url: string,
  {
    headers = {},
    ttlMs = 30_000,
    pollIntervalMs = 30_000,
    enabled = true,
    onSuccess,
  }: UseCachedFetchOptions<T> = {}
): UseCachedFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;
    const isFirst = isFirstLoad.current;

    // Use cache on re-fetches, skip on first load
    if (!isFirst) {
      const cached = globalCache.get(url) as T | null;
      if (cached) { setData(cached); setIsRefreshing(false); return; }
      setIsRefreshing(true);
    }

    try {
      const res = await retryFetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: T = await res.json();
      globalCache.set(url, json, ttlMs);
      setData(json);
      setError(null);
      setLastUpdatedAt(new Date());
      onSuccess?.(json);
    } catch (e: any) {
      setError(e.message ?? 'Fetch failed');
    } finally {
      if (isFirst) { setLoading(false); isFirstLoad.current = false; }
      setIsRefreshing(false);
    }
  }, [url, enabled, ttlMs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  usePollInterval(fetchData, {
    intervalMs: pollIntervalMs,
    pauseOnHidden: true,
    enabled: enabled && !!url,
  });

  return { data, loading, error, isRefreshing, lastUpdatedAt, refetch: fetchData };
}