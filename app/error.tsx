"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="eyebrow text-deepgold">Something went wrong</span>
      <h1 className="heading-display text-[clamp(2rem,4vw,3rem)]">We hit a problem loading this page</h1>
      <p className="max-w-md text-ink-body">Please try again. If it keeps happening, contact our team.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[52px] items-center rounded bg-obsidian px-6 text-xs font-bold uppercase tracking-button text-white"
      >
        Try again
      </button>
    </main>
  );
}
