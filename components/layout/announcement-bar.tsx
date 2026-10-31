import Link from "next/link";

export function AnnouncementBar({
  text,
  linkText,
  linkUrl,
}: {
  text: string | null;
  linkText: string | null;
  linkUrl: string | null;
}) {
  if (!text) return null;
  return (
    <div className="border-b border-graphite-line bg-obsidian text-[#D9D6CE]">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-center text-[13px] tracking-[0.04em]">
        <span aria-hidden="true" className="h-1.5 w-1.5 bg-champagne" />
        <span>{text}</span>
        {linkText && linkUrl ? (
          <Link href={linkUrl} className="font-semibold text-champagne hover:text-champagne-hover">
            {linkText}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
