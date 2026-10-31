import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-obsidian px-6 text-center text-white">
      <span className="eyebrow text-champagne">404</span>
      <h1 className="heading-display text-[clamp(2.2rem,5vw,3.6rem)]">We couldn’t find that page</h1>
      <p className="max-w-md text-mist">The page may have moved. Head back to the showroom to keep browsing.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-[52px] items-center rounded bg-champagne px-6 text-xs font-bold uppercase tracking-button text-obsidian">
          Home
        </Link>
        <Link href="/inventory" className="inline-flex min-h-[52px] items-center rounded border border-[#5B616B] px-6 text-xs font-bold uppercase tracking-button">
          Inventory
        </Link>
      </div>
    </main>
  );
}
