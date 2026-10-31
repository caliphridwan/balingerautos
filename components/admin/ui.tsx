import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        {back ? (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-obsidian">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-[32px] leading-tight">{title}</h1>
        {description ? <div className="text-sm text-ink-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("border border-ivory-line bg-white", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory-soft px-5 py-4">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatTile({ label, value, note, href }: { label: string; value: string | number; note?: string; href?: string }) {
  const inner = (
    <>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">{label}</span>
      <span className="text-[32px] font-semibold tracking-tight">{value}</span>
      {note ? <span className="text-xs text-ink-muted">{note}</span> : null}
    </>
  );
  const cls = "flex flex-col gap-2 bg-white p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-ivory")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

const badgeTones = {
  dark: "bg-obsidian text-white border-obsidian",
  outline: "bg-white text-obsidian border-obsidian",
  amber: "bg-[#F3E9D6] text-[#5C431B] border-[#E2CFA9]",
  blue: "bg-[#E6ECF4] text-[#1F3557] border-[#C8D4E4]",
  green: "bg-[#E4EEE7] text-[#1E4A2E] border-[#C3D9CA]",
  red: "bg-[#F6E3DF] text-[#7A2A1E] border-[#E6C2BA]",
  muted: "bg-ivory-soft text-ink-body border-[#D4D1C8]",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-xl">{title}</p>
      {body ? <p className="max-w-md text-sm text-ink-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th scope="col" className={cn("border-b border-ivory-soft px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-ivory-soft px-4 py-3 align-middle", className)}>{children}</td>;
}

/** Page navigation using a caller-supplied href builder. */
export function AdminPagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const cell = "inline-flex h-10 min-w-[40px] items-center justify-center border px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-4 py-4 text-sm">
      <span className="text-ink-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} aria-label="Previous page" className={cn(cell, "border-[#D4D1C8] hover:border-obsidian")}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={href(page + 1)} aria-label="Next page" className={cn(cell, "border-[#D4D1C8] hover:border-obsidian")}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export const adminInput =
  "h-10 rounded border border-[#D4D1C8] bg-white px-3 text-sm text-obsidian placeholder:text-ink-muted focus:border-obsidian focus:outline-none";

export const adminButton = {
  dark: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded bg-obsidian px-4 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-graphite disabled:opacity-50",
  outline: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded border border-[#D4D1C8] bg-white px-4 text-xs font-bold uppercase tracking-[0.08em] text-obsidian hover:border-obsidian disabled:opacity-50",
  gold: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded bg-champagne px-4 text-xs font-bold uppercase tracking-[0.08em] text-obsidian hover:bg-champagne-hover disabled:opacity-50",
  danger: "inline-flex min-h-[40px] items-center justify-center gap-2 rounded border border-[#E6C2BA] bg-white px-4 text-xs font-bold uppercase tracking-[0.08em] text-[#7A2A1E] hover:bg-[#F6E3DF] disabled:opacity-50",
};
