"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { AgreementInput } from "@/lib/deed/schema";

// The unfinished New agreement form, kept in this browser (localStorage) so a
// closed tab, a reload or a power cut doesn't lose it. One draft per login on
// each device; nothing goes to the server until the agreement is saved, and
// the draft is removed then (or on Start over).

const VERSION = 1;

export interface AgreementDraft {
  v: typeof VERSION;
  savedAt: string;
  values: AgreementInput;
  /** Chosen units' names, to say which one was rented in the meantime. */
  unitNames: Record<string, string>;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // changes made in another tab
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked (e.g. private window): work without a draft
  }
}

function parse(raw: string | null): AgreementDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    return draft?.v === VERSION && draft.values ? draft : null;
  } catch {
    return null;
  }
}

function write(key: string, draft: AgreementDraft | null) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage full or blocked: the form still works, just without a draft.
  }
  listeners.forEach((listener) => listener());
}

/** Deep equality for plain form data, to tell an untouched form from a draft. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every((k) => same(x[k], y[k]));
}

/**
 * Saves the form shortly after each change (and at once when the page closes
 * or the user leaves it), and hands back a saved draft once on mount.
 * Returns when the draft was last saved, and a way to throw it away.
 */
export function useAgreementDraft({
  form,
  storageKey,
  empty,
  unitNames,
  onRestore,
}: {
  form: UseFormReturn<AgreementInput>;
  storageKey: string;
  /** The untouched form: if the form matches it, there is nothing to keep. */
  empty: AgreementInput;
  /** Unit id -> name, for the units on offer. */
  unitNames: Record<string, string>;
  onRestore: (draft: AgreementDraft) => void;
}) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(storageKey), () => null);
  const savedAt = useMemo(() => parse(raw)?.savedAt ?? null, [raw]);
  const cancelPending = useRef<() => void>(() => {});

  // Bring a saved draft back once, after mount (storage isn't readable on the server).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = parse(readRaw(storageKey));
    if (draft) onRestore(draft);
  }, [storageKey, onRestore]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      timer = null;
      const values = form.getValues();
      // Only real changes: the form re-announces values after a restore.
      const kept = parse(readRaw(storageKey));
      if (kept && same(kept.values, values)) return;
      write(
        storageKey,
        same(values, empty)
          ? null
          : {
              v: VERSION,
              savedAt: new Date().toISOString(),
              values,
              unitNames: Object.fromEntries(values.unitIds.map((id) => [id, unitNames[id] ?? ""])),
            },
      );
    };
    const flush = () => {
      if (timer) {
        clearTimeout(timer);
        save();
      }
    };
    const sub = form.watch((_, { name }) => {
      if (!name) return; // a reset (restoring or starting over), not typing
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 300);
    });
    cancelPending.current = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      sub.unsubscribe();
      window.removeEventListener("pagehide", flush);
      flush(); // leaving the page within a moment of typing
    };
  }, [form, storageKey, empty, unitNames]);

  /** Forget the draft: after the agreement is saved, or to start over. */
  const discard = useCallback(() => {
    cancelPending.current();
    write(storageKey, null);
  }, [storageKey]);

  return { savedAt, discard };
}
