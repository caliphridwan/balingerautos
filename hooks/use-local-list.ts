"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A small list of strings (vehicle slugs) persisted in localStorage and kept
 * in sync across components and tabs. Storage can be unavailable (private
 * mode, blocked cookies), so every access is guarded and falls back to memory.
 */

const memory = new Map<string, string[]>();
const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, { raw: string | null; value: string[] }>();
const EMPTY: string[] = [];

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? EMPTY;
  }
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value;
  let value: string[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : EMPTY;
  } catch {
    value = EMPTY;
  }
  snapshots.set(key, { raw, value });
  return value;
}

function write(key: string, value: string[]): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: memory copy still works for this page view
  }
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalList(key: string, max: number) {
  const items = useSyncExternalStore(
    (l) => subscribe(key, l),
    () => read(key),
    () => EMPTY,
  );

  const add = useCallback(
    (value: string, opts?: { front?: boolean }) => {
      const current = read(key).filter((v) => v !== value);
      const next = opts?.front ? [value, ...current] : [...current, value];
      write(key, opts?.front ? next.slice(0, max) : next.slice(-max));
    },
    [key, max],
  );
  const remove = useCallback((value: string) => write(key, read(key).filter((v) => v !== value)), [key]);
  const toggle = useCallback(
    (value: string): boolean => {
      const current = read(key);
      if (current.includes(value)) {
        write(key, current.filter((v) => v !== value));
        return false;
      }
      if (current.length >= max) return false;
      write(key, [...current, value]);
      return true;
    },
    [key, max],
  );
  const clear = useCallback(() => write(key, []), [key]);

  return { items, add, remove, toggle, clear, has: (v: string) => items.includes(v), isFull: items.length >= max };
}

export const FAVOURITES_KEY = "ba:favourites";
export const COMPARE_KEY = "ba:compare";
export const RECENT_KEY = "ba:recently-viewed";
export const MAX_FAVOURITES = 30;
export const MAX_COMPARE = 3;
export const MAX_RECENT = 8;
