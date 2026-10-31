export const primaryNav = [
  { label: "Inventory", href: "/inventory" },
  { label: "Services", href: "/services" },
  { label: "Financing", href: "/financing" },
  { label: "Trade-in", href: "/trade-in" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerShowroomNav = [
  { label: "All inventory", href: "/inventory" },
  { label: "New arrivals", href: "/inventory?sort=newest" },
  { label: "Compare vehicles", href: "/compare" },
  { label: "Saved vehicles", href: "/favourites" },
  { label: "Vehicle sourcing", href: "/services#sourcing" },
] as const;

export const footerCompanyNav = [
  { label: "About us", href: "/about" },
  { label: "Our services", href: "/services" },
  { label: "Financing", href: "/financing" },
  { label: "Trade-in", href: "/trade-in" },
  { label: "Contact", href: "/contact" },
] as const;
