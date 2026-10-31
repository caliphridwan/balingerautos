import Link from "next/link";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumb: Array<{ label: string; href?: string }>;
  children?: React.ReactNode;
}

/** Dark title band used at the top of inner pages. */
export function PageHero({ eyebrow, title, description, breadcrumb, children }: PageHeroProps) {
  return (
    <section className="border-t border-graphite-line bg-obsidian text-white">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-6 pb-16 pt-14 md:pb-20">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2.5 text-[13px] text-mist-dim">
            {breadcrumb.map((item, i) => (
              <li key={item.label} className="flex gap-2.5">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href ? (
                  <Link href={item.href} className="text-mist hover:text-champagne">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <span className="eyebrow text-champagne">{eyebrow}</span>
        <h1 className="heading-display max-w-4xl text-[clamp(2.4rem,5.2vw,4.4rem)] leading-[1.04]">{title}</h1>
        {description ? <p className="max-w-2xl text-lg leading-relaxed text-[#C9CBD0] text-pretty">{description}</p> : null}
        {children}
      </div>
    </section>
  );
}
