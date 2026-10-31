import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  gold: "bg-champagne text-obsidian hover:bg-champagne-hover",
  dark: "bg-obsidian text-white hover:bg-graphite",
  outline: "border border-obsidian text-obsidian hover:bg-obsidian hover:text-white",
  "outline-light": "border border-[#5B616B] text-white hover:border-champagne hover:text-champagne",
} as const;

const sizes = {
  md: "min-h-[48px] px-5 text-xs",
  lg: "min-h-[56px] px-7 text-[13px]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "gold", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2.5 rounded font-bold uppercase tracking-button transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />;
});

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

/** Underlined uppercase text link used for section "view all" actions. */
export function TextLink({
  className,
  tone = "dark",
  ...props
}: React.ComponentProps<typeof Link> & { tone?: "dark" | "light" }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center border-b pb-1 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
        tone === "dark"
          ? "border-obsidian text-obsidian hover:border-deepgold hover:text-deepgold"
          : "border-white text-white hover:border-champagne hover:text-champagne",
        className,
      )}
      {...props}
    />
  );
}
