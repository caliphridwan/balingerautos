import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  if (await getStaffUser()) redirect("/admin");
  // Only allow same-site admin paths as the post-login destination.
  const callback = searchParams.callbackUrl ?? "/admin";
  let safe = "/admin";
  try {
    const path = callback.startsWith("/") ? callback : new URL(callback).pathname + new URL(callback).search;
    if (path.startsWith("/admin") && !path.startsWith("//")) safe = path;
  } catch {
    safe = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-obsidian px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-1 text-white">
          <span className="font-display text-3xl tracking-[0.18em]">BALINGER</span>
          <span className="text-[10px] font-bold tracking-[0.6em] text-champagne">AUTOS · ADMIN</span>
        </div>
        <div className="border border-graphite-line bg-graphite p-8">
          <h1 className="mb-6 font-display text-2xl text-white">Sign in</h1>
          <LoginForm callbackUrl={safe} initialError={searchParams.error ? "Sign-in failed. Please check your details." : null} />
        </div>
      </div>
    </main>
  );
}
