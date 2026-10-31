import { MessageCircle, Phone } from "lucide-react";

/** Fixed bottom bar on phones: price + quick actions. */
export function MobileCtaBar({ price, phoneHref, whatsappHref }: { price: string; phoneHref: string | null; whatsappHref: string | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-graphite-line bg-obsidian px-4 py-3 text-white lg:hidden">
      <span className="mr-auto text-lg font-bold">{price}</span>
      {phoneHref ? (
        <a href={phoneHref} aria-label="Call the showroom" className="inline-flex h-11 w-11 items-center justify-center border border-graphite-muted">
          <Phone className="h-5 w-5" strokeWidth={1.6} />
        </a>
      ) : null}
      {whatsappHref ? (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Enquire on WhatsApp" className="inline-flex h-11 w-11 items-center justify-center border border-graphite-muted">
          <MessageCircle className="h-5 w-5" strokeWidth={1.6} />
        </a>
      ) : null}
      <a href="#enquire" className="inline-flex h-11 items-center bg-champagne px-4 text-xs font-bold uppercase tracking-button text-obsidian">
        Enquire
      </a>
    </div>
  );
}
