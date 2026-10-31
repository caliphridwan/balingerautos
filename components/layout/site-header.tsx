"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface SiteHeaderProps {
  phoneHref: string | null;
  phoneLabel: string | null;
  whatsappHref: string | null;
}

export function SiteHeader({ phoneHref, phoneLabel, whatsappHref }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu on navigation and lock body scroll while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-line/60 bg-obsidian/95 text-white backdrop-blur supports-[backdrop-filter]:bg-obsidian/85">
      <div className="mx-auto flex max-w-content items-center justify-between gap-6 px-6 py-5">
        <Logo />
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-sm tracking-[0.03em]">
            {primaryNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("transition-colors hover:text-champagne", active && "text-champagne")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          {phoneHref && phoneLabel ? (
            <a href={phoneHref} className="hidden text-sm text-[#D9D6CE] transition-colors hover:text-champagne xl:inline">
              {phoneLabel}
            </a>
          ) : null}
          <Link
            href="/inventory"
            className="hidden min-h-[44px] items-center rounded bg-champagne px-5 text-xs font-bold uppercase tracking-button text-obsidian transition-colors hover:bg-champagne-hover sm:inline-flex"
          >
            Explore inventory
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded border border-graphite-muted lg:hidden"
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[85px] z-40 overflow-y-auto bg-obsidian lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-8 px-6 py-10">
            <ul className="flex flex-col">
              {primaryNav.map((item) => (
                <li key={item.label} className="border-b border-graphite-line">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[60px] items-center font-display text-2xl"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              {phoneHref ? (
                <a href={phoneHref} className="inline-flex min-h-[52px] items-center justify-center gap-2 border border-graphite-muted text-sm font-semibold">
                  <Phone className="h-4 w-4" strokeWidth={1.6} /> Call the showroom
                </a>
              ) : null}
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 bg-champagne text-sm font-bold uppercase tracking-button text-obsidian"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.6} /> WhatsApp us
                </a>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
