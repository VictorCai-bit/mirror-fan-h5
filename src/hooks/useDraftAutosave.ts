import { useCallback, useEffect, useRef } from 'react';

const STUDIO_DRAFT_KEY = 'studioDraft';

export function useDraftAutosave<T>(opts: {
  key?: string;
  value: T;
  intervalMs?: number;
  debounceMs?: number;
  enabled?: boolean;
  onRestore?: (payload: T, savedAt: number) => void;
}) {
  const {
    key = STUDIO_DRAFT_KEY,
    value,
    intervalMs = 30_000,
    debounceMs = 1000,
    enabled = true,
    onRestore,
  } = opts;
  const valueRef = useRef(value);
  valueRef.current = value;
  const debounceRef = useRef<number>();
  // Keep onRestore in a ref so the restore effect only runs once on mount
  // (when key/enabled change), not on every render due to inline function identity.
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const save = useCallback(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ savedAt: Date.now(), payload: valueRef.current }),
      );
    } catch {
      /* ignore */
    }
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const { savedAt, payload } = JSON.parse(raw) as { savedAt: number; payload: T };
        if (payload && onRestoreRef.current) onRestoreRef.current(payload, savedAt);
      }
    } catch {
      /* ignore */
    }
  // onRestoreRef is intentionally excluded — it's a stable ref, not a reactive value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(save, debounceMs);
    return () => window.clearTimeout(debounceRef.current);
  }, [value, debounceMs, save, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(save, intervalMs);
    const onUnload = () => save();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [intervalMs, save, enabled]);
}
