"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** WhatsApp shortcut + (optional) AI assistant, bottom-right. */
export function FloatingActions({ whatsappHref, assistantEnabled }: { whatsappHref: string | null; assistantEnabled: boolean }) {
  const pathname = usePathname();
  // Vehicle pages have their own mobile action bar.
  const onVehiclePage = /^\/inventory\/[^/]+$/.test(pathname);
  const [open, setOpen] = useState(false);

  if (!whatsappHref && !assistantEnabled) return null;
  return (
    <div className={cn("fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3", onVehiclePage && "hidden lg:flex")}>
      {open ? <AssistantPanel onClose={() => setOpen(false)} /> : null}
      <div className="flex gap-3">
        {assistantEnabled ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close assistant" : "Ask our assistant"}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-obsidian text-champagne shadow-[0_12px_32px_rgba(16,17,20,0.35)] ring-1 ring-graphite-muted transition-transform hover:scale-105"
          >
            {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" strokeWidth={1.5} />}
          </button>
        ) : null}
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-champagne text-obsidian shadow-[0_12px_32px_rgba(16,17,20,0.35)] transition-transform hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim().slice(0, 1000);
    if (!text || pending) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "The assistant is unavailable right now.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      role="dialog"
      aria-label="Balinger Autos assistant"
      className="flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col border border-graphite-line bg-obsidian text-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-graphite-line px-5 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Ask Balinger</span>
          <span className="text-xs text-mist-dim">Answers from our current inventory and FAQs</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close assistant" className="inline-flex h-10 w-10 items-center justify-center hover:text-champagne">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-mist">
            Hello — I can help you find a vehicle, compare options or answer questions about financing, trade-ins and test drives. What are you looking for?
          </p>
        ) : null}
        {messages.map((m, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[88%] whitespace-pre-line px-3.5 py-2.5 [overflow-wrap:anywhere]",
              m.role === "user" ? "self-end bg-champagne text-obsidian" : "self-start bg-graphite",
            )}
          >
            {m.content}
          </p>
        ))}
        {pending ? <p className="self-start bg-graphite px-3.5 py-2.5 text-mist">Thinking…</p> : null}
        {error ? <p role="alert" className="text-[#F2B8A8]">{error}</p> : null}
      </div>
      <form onSubmit={(e) => void send(e)} className="flex border-t border-graphite-line">
        <label htmlFor="assistant-input" className="sr-only">
          Your question
        </label>
        <input
          ref={inputRef}
          id="assistant-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="e.g. a 7-seat SUV under ₦150 million"
          className="h-14 min-w-0 flex-1 bg-transparent px-5 text-sm placeholder:text-mist-dim focus:outline-none"
        />
        <button type="submit" disabled={pending || !input.trim()} aria-label="Send" className="inline-flex w-14 items-center justify-center text-champagne disabled:opacity-40">
          <Send className="h-5 w-5" />
        </button>
      </form>
      <p className="border-t border-graphite-line px-5 py-2 text-[11px] text-mist-dim">AI assistant — please confirm details with our team.</p>
    </section>
  );
}
