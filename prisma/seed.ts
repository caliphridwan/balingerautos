/**
 * Seed script — creates categories, demo inventory, FAQs, site settings
 * and the first SUPER_ADMIN account.
 *
 * Safe to re-run: every write is an upsert keyed on a unique field.
 *
 *   npx prisma db seed
 *
 * Demo vehicles are realistic examples for development and review. Replace
 * them with real stock (via the admin dashboard) before launch.
 * No testimonials or business statistics are seeded: those must come from
 * the business itself.
 */
import {
  PrismaClient,
  BodyType,
  Drivetrain,
  FeatureGroup,
  FuelType,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "SUVs", slug: "suvs", description: "Commanding, capable and refined." },
  { name: "Sedans", slug: "sedans", description: "Executive comfort for every journey." },
  { name: "Coupes", slug: "coupes", description: "Two-door elegance and poise." },
  { name: "Luxury Cars", slug: "luxury", description: "The finest in craftsmanship." },
  { name: "Sports Cars", slug: "sports", description: "Performance without compromise." },
  { name: "Pickup Trucks", slug: "pickups", description: "Strength with sophistication." },
  { name: "Crossovers", slug: "crossovers", description: "Versatility for modern life." },
  { name: "Electric & Hybrid", slug: "electric-hybrid", description: "Efficient, quiet, forward-looking." },
] as const;

type CategorySlug = (typeof categories)[number]["slug"];

interface SeedVehicle {
  stockNumber: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  bodyType: BodyType;
  condition: VehicleCondition;
  status: VehicleStatus;
  price: number;
  mileage: number;
  transmission: TransmissionType;
  fuelType: FuelType;
  drivetrain: Drivetrain;
  engineCapacityCc?: number;
  horsepower?: number;
  doors: number;
  seats: number;
  exteriorColour: string;
  interiorColour: string;
  isFeatured?: boolean;
  daysAgo: number;
  categories: CategorySlug[];
  /** Demo photography (Unsplash, free to use). Replace with photos of your actual stock. */
  images: Array<{ url: string; alt: string }>;
  description: string;
  features: Partial<Record<FeatureGroup, string[]>>;
}

const vehicles: SeedVehicle[] = [
  {
    stockNumber: "BA-24017", make: "Mercedes-Benz", model: "GLC 300", trim: "4MATIC AMG Line", year: 2024,
    bodyType: BodyType.SUV, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 95000000,
    mileage: 8200, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.AWD,
    engineCapacityCc: 1999, horsepower: 255, doors: 5, seats: 5, exteriorColour: "Black", interiorColour: "Beige",
    isFeatured: true, daysAgo: 3, categories: ["suvs", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1611859265909-af99ce570287?auto=format&fit=crop&w=1600&q=80", alt: "Black Mercedes-Benz on the road" }, { url: "https://images.unsplash.com/photo-1617814076231-2c58846db944?auto=format&fit=crop&w=1600&q=80", alt: "Black Mercedes-Benz, side view" }, { url: "https://images.unsplash.com/photo-1612368801878-ab107b75bb77?auto=format&fit=crop&w=1600&q=80", alt: "Mercedes-Benz steering wheel and dashboard" }],
    description: "A one-owner GLC 300 in AMG Line specification, finished in obsidian black with macchiato beige leather. Panoramic roof, Burmester audio and the full driver-assistance package.",
    features: {
      KEY: ["AMG Line exterior and interior", "Panoramic sliding sunroof", "20-inch AMG alloy wheels", "Power tailgate"],
      SAFETY: ["Active Brake Assist", "Blind Spot Assist", "360° camera", "Lane Keeping Assist"],
      COMFORT: ["Heated front seats", "Dual-zone climate control", "Ambient lighting"],
      TECHNOLOGY: ["MBUX 11.9-inch touchscreen", "Burmester surround sound", "Wireless Apple CarPlay / Android Auto"],
    },
  },
  {
    stockNumber: "BA-23104", make: "BMW", model: "X5", trim: "xDrive40i M Sport", year: 2023,
    bodyType: BodyType.SUV, condition: VehicleCondition.USED, status: VehicleStatus.RESERVED, price: 110000000,
    mileage: 14600, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.AWD,
    engineCapacityCc: 2998, horsepower: 375, doors: 5, seats: 5, exteriorColour: "Black", interiorColour: "Black",
    isFeatured: true, daysAgo: 9, categories: ["suvs", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1626381958625-f4e4ea343925?auto=format&fit=crop&w=1600&q=80", alt: "Black BMW on the road" }, { url: "https://images.unsplash.com/photo-1605036242577-8ee228902af1?auto=format&fit=crop&w=1600&q=80", alt: "BMW steering wheel" }],
    description: "M Sport X5 with the 3.0-litre straight-six, adaptive suspension and a full BMW service history.",
    features: {
      KEY: ["M Sport package", "Adaptive M suspension", "21-inch M wheels"],
      SAFETY: ["Driving Assistant Professional", "Parking Assistant Plus"],
      COMFORT: ["Four-zone climate", "Heated steering wheel"],
      TECHNOLOGY: ["BMW Live Cockpit Professional", "Harman Kardon audio", "Head-up display"],
    },
  },
  {
    stockNumber: "BA-24031", make: "Porsche", model: "Cayenne", trim: "E-Hybrid", year: 2024,
    bodyType: BodyType.SUV, condition: VehicleCondition.NEW, status: VehicleStatus.AVAILABLE, price: 185000000,
    mileage: 120, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PLUG_IN_HYBRID, drivetrain: Drivetrain.AWD,
    engineCapacityCc: 2995, horsepower: 463, doors: 5, seats: 5, exteriorColour: "Black", interiorColour: "Black",
    isFeatured: true, daysAgo: 2, categories: ["suvs", "luxury", "electric-hybrid"],
    images: [{ url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80", alt: "Black Porsche in motion" }],
    description: "Delivery-mileage Cayenne E-Hybrid with the latest facelift interior, Sport Chrono and air suspension.",
    features: {
      KEY: ["Sport Chrono package", "Adaptive air suspension", "21-inch RS Spyder Design wheels"],
      SAFETY: ["Lane Change Assist", "Surround View"],
      COMFORT: ["14-way comfort seats with memory", "Four-zone climate"],
      TECHNOLOGY: ["Porsche Communication Management", "BOSE surround sound", "Passenger display"],
    },
  },
  {
    stockNumber: "BA-22088", make: "Land Rover", model: "Range Rover Sport", trim: "HSE Dynamic", year: 2022,
    bodyType: BodyType.SUV, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 135000000,
    mileage: 21400, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.DIESEL, drivetrain: Drivetrain.FOUR_WD,
    engineCapacityCc: 2997, horsepower: 300, doors: 5, seats: 5, exteriorColour: "Silver", interiorColour: "Grey",
    daysAgo: 6, categories: ["suvs", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1679506640590-f0152786dff0?auto=format&fit=crop&w=1600&q=80", alt: "Silver Range Rover parked in front of a building" }, { url: "https://images.unsplash.com/photo-1677228447083-3245a27daf91?auto=format&fit=crop&w=1600&q=80", alt: "Silver Range Rover, three-quarter view" }],
    description: "Range Rover Sport HSE Dynamic with Terrain Response 2, Meridian audio and a clean history.",
    features: {
      KEY: ["Terrain Response 2", "Electronic air suspension", "Sliding panoramic roof"],
      SAFETY: ["Adaptive cruise control", "Blind Spot Assist", "3D Surround Camera"],
      COMFORT: ["Heated and cooled front seats"],
      TECHNOLOGY: ["Pivi Pro infotainment", "Meridian sound system"],
    },
  },
  {
    stockNumber: "BA-24042", make: "Lexus", model: "RX 350h", trim: "Luxury", year: 2024,
    bodyType: BodyType.CROSSOVER, condition: VehicleCondition.CERTIFIED_PRE_OWNED, status: VehicleStatus.AVAILABLE, price: 98000000,
    mileage: 2900, transmission: TransmissionType.CVT, fuelType: FuelType.HYBRID, drivetrain: Drivetrain.AWD,
    engineCapacityCc: 2487, horsepower: 246, doors: 5, seats: 5, exteriorColour: "White", interiorColour: "Black",
    daysAgo: 4, categories: ["crossovers", "electric-hybrid", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1708853980353-737b67cc2060?auto=format&fit=crop&w=1600&q=80", alt: "White SUV parked in front of a building" }],
    description: "Nearly new RX 350h in Luxury grade, certified with the balance of manufacturer warranty.",
    features: {
      KEY: ["Lexus Safety System+ 3.0", "Panoramic glass roof"],
      SAFETY: ["Pre-Collision System", "Lane Tracing Assist"],
      COMFORT: ["Semi-aniline leather", "Heated and ventilated seats"],
      TECHNOLOGY: ["14-inch touchscreen", "Mark Levinson audio"],
    },
  },
  {
    stockNumber: "BA-23077", make: "Toyota", model: "Land Cruiser 300", trim: "GR Sport", year: 2023,
    bodyType: BodyType.SUV, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 160000000,
    mileage: 11800, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.DIESEL, drivetrain: Drivetrain.FOUR_WD,
    engineCapacityCc: 3346, horsepower: 304, doors: 5, seats: 7, exteriorColour: "White", interiorColour: "Black",
    isFeatured: true, daysAgo: 12, categories: ["suvs"],
    images: [{ url: "https://images.unsplash.com/photo-1564481201145-4d5fced5f845?auto=format&fit=crop&w=1600&q=80", alt: "Toyota SUV parked on a hill" }, { url: "https://images.unsplash.com/photo-1624062999726-083e5268525d?auto=format&fit=crop&w=1600&q=80", alt: "White SUV on sand" }],
    description: "Land Cruiser 300 GR Sport with E-KDSS, front and rear locking differentials and seven seats.",
    features: {
      KEY: ["E-KDSS", "Front and rear differential locks", "Multi-Terrain Select"],
      SAFETY: ["Toyota Safety Sense", "Multi-Terrain Monitor"],
      COMFORT: ["Seven seats", "Heated and ventilated front seats"],
      TECHNOLOGY: ["JBL premium audio", "12.3-inch display"],
    },
  },
  {
    stockNumber: "BA-24050", make: "Audi", model: "e-tron GT", trim: "quattro", year: 2024,
    bodyType: BodyType.SEDAN, condition: VehicleCondition.CERTIFIED_PRE_OWNED, status: VehicleStatus.AVAILABLE, price: 175000000,
    mileage: 4300, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.ELECTRIC, drivetrain: Drivetrain.AWD,
    horsepower: 523, doors: 4, seats: 4, exteriorColour: "Grey", interiorColour: "Black",
    daysAgo: 1, categories: ["sedans", "sports", "electric-hybrid", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?auto=format&fit=crop&w=1600&q=80", alt: "Grey sports saloon on a harbour pier" }, { url: "https://images.unsplash.com/photo-1655195194373-616f5a9b93e6?auto=format&fit=crop&w=1600&q=80", alt: "Silver sports car on the road" }],
    description: "Audi's electric grand tourer in Daytona grey with carbon roof and Bang & Olufsen sound.",
    features: {
      KEY: ["Carbon fibre roof", "Adaptive air suspension"],
      SAFETY: ["Adaptive cruise assist", "Rear cross-traffic assist"],
      COMFORT: ["Massage front seats"],
      TECHNOLOGY: ["Bang & Olufsen 3D sound", "Audi virtual cockpit plus"],
    },
  },
  {
    stockNumber: "BA-23112", make: "Mercedes-Benz", model: "E 300", trim: "AMG Line", year: 2023,
    bodyType: BodyType.SEDAN, condition: VehicleCondition.USED, status: VehicleStatus.RESERVED, price: 82000000,
    mileage: 9700, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.RWD,
    engineCapacityCc: 1991, horsepower: 255, doors: 4, seats: 5, exteriorColour: "Grey", interiorColour: "Black",
    daysAgo: 15, categories: ["sedans", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1546518071-fddcdda7580a?auto=format&fit=crop&w=1600&q=80", alt: "Grey Mercedes-Benz saloon" }],
    description: "E 300 AMG Line saloon with widescreen cockpit and a full dealer history.",
    features: {
      KEY: ["AMG Line styling", "LED Multibeam headlights"],
      SAFETY: ["Driver Assistance Package", "Parking package with 360° camera"],
      COMFORT: ["Heated front seats", "Keyless-Go"],
      TECHNOLOGY: ["Widescreen cockpit", "Burmester audio"],
    },
  },
  {
    stockNumber: "BA-24063", make: "BMW", model: "M440i", trim: "Gran Coupé xDrive", year: 2024,
    bodyType: BodyType.COUPE, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 105000000,
    mileage: 6100, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.AWD,
    engineCapacityCc: 2998, horsepower: 382, doors: 4, seats: 5, exteriorColour: "Black", interiorColour: "Black",
    daysAgo: 7, categories: ["coupes", "sports"],
    images: [{ url: "https://images.unsplash.com/photo-1628079586925-6e7792daaf0b?auto=format&fit=crop&w=1600&q=80", alt: "Black BMW on the road" }, { url: "https://images.unsplash.com/photo-1570356528233-b442cf2de345?auto=format&fit=crop&w=1600&q=80", alt: "Black BMW coupe, parked" }],
    description: "M440i Gran Coupé with M Sport differential, adaptive suspension and Harman Kardon audio.",
    features: {
      KEY: ["M Sport differential", "Adaptive M suspension"],
      SAFETY: ["Driving Assistant"],
      COMFORT: ["Heated sport seats"],
      TECHNOLOGY: ["Harman Kardon audio", "BMW Curved Display"],
    },
  },
  {
    stockNumber: "BA-24071", make: "Porsche", model: "911", trim: "Carrera S", year: 2024,
    bodyType: BodyType.COUPE, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 260000000,
    mileage: 3400, transmission: TransmissionType.SEMI_AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.RWD,
    engineCapacityCc: 2981, horsepower: 443, doors: 2, seats: 4, exteriorColour: "Red", interiorColour: "Black",
    isFeatured: true, daysAgo: 5, categories: ["coupes", "sports", "luxury"],
    images: [{ url: "https://images.unsplash.com/photo-1671632849536-dcece56784cc?auto=format&fit=crop&w=1600&q=80", alt: "Red sports car in a showroom" }, { url: "https://images.unsplash.com/photo-1554744512-d6c603f27c54?auto=format&fit=crop&w=1600&q=80", alt: "Red sports car, close-up" }],
    description: "911 Carrera S in Guards red with Sport Chrono, sports exhaust and PASM.",
    features: {
      KEY: ["Sport Chrono package", "Sports exhaust", "PASM"],
      SAFETY: ["Lane Change Assist"],
      COMFORT: ["Sport seats Plus"],
      TECHNOLOGY: ["BOSE surround sound"],
    },
  },
  {
    stockNumber: "BA-23095", make: "Ford", model: "F-150", trim: "Platinum", year: 2023,
    bodyType: BodyType.PICKUP, condition: VehicleCondition.USED, status: VehicleStatus.AVAILABLE, price: 90000000,
    mileage: 18900, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.PETROL, drivetrain: Drivetrain.FOUR_WD,
    engineCapacityCc: 3496, horsepower: 400, doors: 4, seats: 5, exteriorColour: "Black", interiorColour: "Brown",
    daysAgo: 20, categories: ["pickups"],
    images: [{ url: "https://images.unsplash.com/photo-1615383563365-82189c96298d?auto=format&fit=crop&w=1600&q=80", alt: "Black Ford F-150 on snow" }, { url: "https://images.unsplash.com/photo-1711512302274-8aafe96481bb?auto=format&fit=crop&w=1600&q=80", alt: "Black pickup truck in a garage" }],
    description: "F-150 Platinum SuperCrew with the 3.5 EcoBoost, Pro Power Onboard and max trailer tow.",
    features: {
      KEY: ["Pro Power Onboard", "Max Trailer Tow package"],
      SAFETY: ["Ford Co-Pilot360"],
      COMFORT: ["Massaging front seats"],
      TECHNOLOGY: ["B&O Unleashed audio", "12-inch SYNC 4"],
    },
  },
  {
    stockNumber: "BA-24088", make: "Tesla", model: "Model Y", trim: "Long Range", year: 2024,
    bodyType: BodyType.CROSSOVER, condition: VehicleCondition.USED, status: VehicleStatus.SOLD, price: 70000000,
    mileage: 7600, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.ELECTRIC, drivetrain: Drivetrain.AWD,
    horsepower: 384, doors: 5, seats: 5, exteriorColour: "White", interiorColour: "White",
    daysAgo: 30, categories: ["crossovers", "electric-hybrid"],
    images: [{ url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=80", alt: "White Tesla parked by a mountain" }, { url: "https://images.unsplash.com/photo-1572191267783-5618f992aff5?auto=format&fit=crop&w=1600&q=80", alt: "Tesla steering wheel and touchscreen" }],
    description: "Model Y Long Range dual motor with white interior.",
    features: {
      KEY: ["Dual motor all-wheel drive", "Glass roof"],
      SAFETY: ["Autopilot"],
      TECHNOLOGY: ["15-inch touchscreen"],
    },
  },
];

function vehicleSlug(v: SeedVehicle): string {
  return [v.year, v.make, v.model, v.trim, v.stockNumber]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Demo site imagery (Unsplash, free to use). Replace from Admin → Content. */
const DEMO_IMAGES = {
  hero: "https://images.unsplash.com/photo-1618418721668-0d1f72aa4bab?auto=format&fit=crop&w=2400&q=80",
  about: "https://images.unsplash.com/photo-1616591938203-9b5630a01006?auto=format&fit=crop&w=1600&q=80",
  promo: "https://images.unsplash.com/photo-1608341089966-92c09e62214f?auto=format&fit=crop&w=2400&q=80",
};

const faqs = [
  { question: "Can I inspect a vehicle before I commit?", answer: "Yes. Book an inspection or test drive from any vehicle page, and we will confirm a time with you." },
  { question: "Do you accept trade-ins?", answer: "We do. Submit your vehicle's details and photos through the trade-in form and our team will review it and respond with a valuation." },
  { question: "Can you help with financing?", answer: "We can help you submit a financing enquiry to partner lenders. Approval and terms are decided by the lender." },
  { question: "Can you source a vehicle that isn't in your inventory?", answer: "Yes. Tell us the make, model, specification and budget, and we will search on your behalf." },
  { question: "How do I reserve a vehicle?", answer: "Send a reservation request from the vehicle page. A member of our team will contact you to confirm the next steps." },
];

async function main() {
  // Site settings (singleton). Contact details stay empty until the business enters them.
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      announcementText: "Private viewings and test drives by appointment.",
      announcementLinkText: "Book a visit",
      announcementLinkUrl: "/contact",
      promoEyebrow: "Trade-in & exchange",
      promoHeading: "Trade up with confidence.",
      promoBody: "Tell us about your current vehicle and our team will review it and get back to you with a valuation.",
      promoCtaText: "Value my vehicle",
      promoCtaUrl: "/trade-in",
      aboutHeading: "Redefining how exceptional cars are bought",
    },
  });
  const current = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "default" } });
  await prisma.siteSettings.update({
    where: { id: "default" },
    data: {
      // Older databases were created with USD defaults — move them to naira.
      ...(current.currency === "USD" ? { currency: "NGN", locale: "en-NG" } : {}),
      ...(current.heroImageUrl ? {} : { heroImageUrl: DEMO_IMAGES.hero, heroImageAlt: "Luxury car with chrome grille at night" }),
      ...(current.aboutImageUrl ? {} : { aboutImageUrl: DEMO_IMAGES.about }),
      ...(current.promoImageUrl ? {} : { promoImageUrl: DEMO_IMAGES.promo }),
      ...(current.ogImageUrl ? {} : { ogImageUrl: DEMO_IMAGES.hero }),
    },
  });

  // Categories
  const categoryIds = new Map<string, string>();
  for (const [position, c] of categories.entries()) {
    const row = await prisma.vehicleCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, position },
      create: { ...c, position },
    });
    categoryIds.set(c.slug, row.id);
  }

  // Admin account
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  let adminId: string | undefined;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
    }
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: process.env.SEED_ADMIN_NAME ?? "Site Administrator",
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: UserRole.SUPER_ADMIN,
      },
    });
    adminId = admin.id;
  } else {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin account.");
  }

  // Vehicles (transaction per vehicle so features + categories stay consistent)
  const now = Date.now();
  for (const v of vehicles) {
    const { features, categories: cats, daysAgo, images, ...data } = v;
    const createdAt = new Date(now - daysAgo * 86_400_000);
    const slug = vehicleSlug(v);
    const featureRows = Object.entries(features).flatMap(([group, labels]) =>
      (labels ?? []).map((label, position) => ({ group: group as FeatureGroup, label, position })),
    );
    const categoryConnect = cats
      .map((slugKey) => categoryIds.get(slugKey))
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id }));

    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.upsert({
        where: { stockNumber: v.stockNumber },
        // Re-running the seed refreshes demo pricing (naira) and colour.
        update: { price: data.price, currency: "NGN", exteriorColour: data.exteriorColour },
        create: {
          ...data,
          slug,
          price: data.price,
          isFeatured: data.isFeatured ?? false,
          isPublished: true,
          publishedAt: createdAt,
          soldAt: data.status === VehicleStatus.SOLD ? new Date(now - 86_400_000) : null,
          createdAt,
          createdById: adminId ?? null,
          categories: { connect: categoryConnect },
        },
      });
      if ((await tx.vehicleImage.count({ where: { vehicleId: vehicle.id } })) === 0 && images.length > 0) {
        await tx.vehicleImage.createMany({
          data: images.map((img, position) => ({ vehicleId: vehicle.id, url: img.url, alt: `${img.alt} (demo photo)`, position })),
        });
      }
      const existing = await tx.vehicleFeature.count({ where: { vehicleId: vehicle.id } });
      if (existing === 0 && featureRows.length > 0) {
        await tx.vehicleFeature.createMany({
          data: featureRows.map((f) => ({ ...f, vehicleId: vehicle.id })),
        });
      }
    });
  }

  // FAQs
  const faqCount = await prisma.fAQ.count();
  if (faqCount === 0) {
    await prisma.fAQ.createMany({
      data: faqs.map((f, position) => ({ ...f, position })),
    });
  }

  const total = await prisma.vehicle.count();
  console.log(`Seed complete: ${total} vehicles, ${categories.length} categories, ${faqs.length} FAQs.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
