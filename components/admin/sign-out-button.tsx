"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ dark }: { dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/admin/login" })}
      className={dark ? "text-sm font-semibold text-obsidian hover:text-deepgold" : "hover:text-champagne"}
    >
      Sign out
    </button>
  );
}
