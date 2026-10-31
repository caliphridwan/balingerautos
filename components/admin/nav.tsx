"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./shell";

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:overflow-visible lg:pb-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[42px] items-center justify-between gap-3 whitespace-nowrap rounded px-3 text-sm font-semibold transition-colors",
                  active ? "bg-graphite text-white" : "hover:bg-graphite/60 hover:text-white",
                )}
              >
                {item.label}
                {item.badge ? <span className="bg-champagne px-1.5 text-[11px] font-bold text-obsidian">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
