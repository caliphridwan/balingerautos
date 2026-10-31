/**
 * Builds a WhatsApp click-to-chat link. Returns null when no number is
 * configured, so callers can hide the button instead of linking nowhere.
 */
export function whatsappLink(number: string | null | undefined, message?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function vehicleWhatsappMessage(vehicle: {
  title: string;
  stockNumber: string;
  price: string;
  url: string;
}): string {
  return [
    `Hello Balinger Autos, I'm interested in the ${vehicle.title}.`,
    `Stock number: ${vehicle.stockNumber}`,
    `Price: ${vehicle.price}`,
    vehicle.url,
  ].join("\n");
}

export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}
