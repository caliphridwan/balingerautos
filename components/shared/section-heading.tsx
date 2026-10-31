import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}

/** Eyebrow + editorial heading. `tone` describes the section background. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "light",
  align = "left",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "mx-auto items-center text-center", className)}>
      <span className={cn("eyebrow", tone === "dark" ? "text-champagne" : "text-deepgold")}>{eyebrow}</span>
      <Tag className="heading-display text-[clamp(2rem,4vw,3.25rem)]">{title}</Tag>
      {description ? (
        <p className={cn("text-base leading-relaxed text-pretty", tone === "dark" ? "text-mist" : "text-ink-body")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
