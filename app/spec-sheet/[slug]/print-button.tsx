"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[44px] items-center gap-2 bg-obsidian px-5 text-xs font-bold uppercase tracking-button text-white hover:bg-graphite"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print / Save as PDF
    </button>
  );
}
