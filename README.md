# Balinger Autos

Premium automotive dealership website and management platform.
Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Prisma · PostgreSQL · NextAuth · Zod · React Hook Form · Framer Motion · Cloudinary · Resend.

> **Status:** feature-complete source. It was written in an environment without
> npm access, so it has **not yet been installed, built or run**. Syntax, internal
> imports, client/server boundaries and the core logic (time zones, booking
> conflicts, CSV, permissions, email escaping) were checked; the first full
> `npm install` → `build` happens on your machine. If anything fails, the error
> message will point at the file to fix.

---

## 1. Quick start

Requirements: **Node.js 20 LTS** and a **PostgreSQL** database (a free [Neon](https://neon.tech) project is easiest).

```bash
npm install                       # also runs `prisma generate`
cp .env.example .env              # then fill it in (see section 2)
npx prisma migrate dev --name init
npm run db:seed
npm run dev                       # http://localhost:3000
```

Sign in to the dashboard at **http://localhost:3000/admin** with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` · `npm run lint` | TypeScript · ESLint |
| `npm run db:migrate` · `npm run db:deploy` | Create migration (dev) · apply migrations (prod) |
| `npm run db:seed` · `npm run db:studio` | Demo data · database browser |

## 2. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Yes | Neon: pooled string for `DATABASE_URL`, direct for `DIRECT_URL`. Local: same string twice. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL. Used in canonical links, sitemap, emails and WhatsApp messages. |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Yes | Secret: `openssl rand -base64 32`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | For seeding | Password must be 12+ characters. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | For photos | Without them, upload areas show a "not configured" notice. |
| `RESEND_API_KEY`, `EMAIL_FROM` | For email | `EMAIL_FROM` must be on a domain verified in Resend. Without them, emails are logged and skipped. |
| `ADMIN_NOTIFICATION_EMAIL` | Optional | Where new-lead emails go (defaults to the public email in Settings). |
| `PAYSTACK_SECRET_KEY` | For online payments | `sk_test_…` while testing, `sk_live_…` in production. Set the webhook URL in Paystack to `https://YOUR-DOMAIN/api/paystack/webhook`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional | Enables the AI assistant. Hidden when no key is set. |

**Settings → Integrations** in the dashboard shows which of these are configured.

## 3. What's included

### Public website
- **Home**: every section from the brief. Stats, testimonials and the promo banner only appear once real values are entered, so nothing is invented.
- **Inventory** (`/inventory`): search plus filters for make, model, year, price, body type, fuel, transmission, mileage, condition, colour and availability. Sorting, grid/list view, removable filter chips, pagination and an empty state. Every filter lives in the URL (shareable) and is run against PostgreSQL. Filtered searches are logged for search analytics.
- **Vehicle detail** (`/inventory/[slug]`): gallery with a fullscreen, swipeable, keyboard-friendly viewer; video link; full specs; feature groups; condition and inspection notes; optional approximate prices in other currencies; and a tabbed enquiry panel (enquire / test drive / finance / reserve) that attaches the vehicle automatically. Also: trade-in link, a WhatsApp message pre-filled with vehicle, stock number, price and URL, save, compare, share, a printable spec sheet, similar and recently viewed vehicles, a sticky mobile action bar, and Product/Car + Breadcrumb structured data.
- **About**, **Services**, **Financing**, **Trade-in** (with photo upload) and **Contact** (with a Google Maps embed, hours, socials and a categorised form).
- **Compare** (`/compare?v=a,b,c`, up to 3) and **Saved vehicles** (`/favourites`). Both are stored on the visitor's device, no account needed.
- **AI assistant**: answers only from published inventory, FAQs and company details (see `lib/ai/assistant.ts`), with rate limiting.
- **SEO**: per-page metadata, Open Graph, canonical URLs, `sitemap.xml`, `robots.txt`, AutoDealer JSON-LD, and noindex on filtered, compare and favourites pages.

### Lead handling
- Every request (vehicle question, callback, inspection, sourcing, reservation, test drive, financing, trade-in) creates a **Customer** (matched by email) and a **VehicleEnquiry** with a reference such as `BA-2611-7KQ3P`, all in one transaction.
- **Test drives**: Mon–Sat slots (`lib/appointments.ts`), entered in the showroom's local time zone and stored in UTC. Live availability per vehicle. Overlapping confirmed bookings are blocked for both the vehicle and the assigned staff member, checked inside a SERIALIZABLE transaction.
- **Emails** (Resend, branded HTML plus a plain-text version): customer acknowledgement, staff new-lead alert, test-drive requested / confirmed / rescheduled / rejected / cancelled, and contact-message alerts.
- **In-dashboard notifications** for managers, and for a rep when a lead is assigned to them.
- **Validation and abuse protection**: Zod on both client and server, honeypot fields, per-IP rate limits, and the financing deposit checked against the vehicle's real price.

### Currency & online payments (Paystack)
- **Naira by default**: prices display as ₦95,000,000 (`en-NG`), and new vehicles, CSV imports and site settings default to NGN. Optional approximate conversions (e.g. `USD=0.00065`) can be shown under prices.
- **Reserve online with a deposit**: when it's turned on in **Settings → Online payments**, available NGN-priced vehicles get a "Reserve online" tab. The customer enters their details and is sent to Paystack's secure checkout (card, bank transfer, USSD, bank). The deposit amount (default ₦500,000) and hold period (default 7 days) are configurable. The deposit is capped at the vehicle price.
- **How a payment is confirmed**: Paystack redirects to `/api/paystack/callback` and also calls the signed webhook `/api/paystack/webhook`. Both re-verify the transaction with Paystack's API and check the amount and currency before acting. Processing is idempotent, so the same payment is never applied twice.
- **On success**: in one transaction, the payment is marked paid, the vehicle is set to Reserved (with a "held until" date) and the enquiry moves to Qualified with a note. The customer gets a receipt email, staff get an email and a dashboard alert.
- **Race protection**: if two people pay for the same car at the same moment, only the first reserves it. The second payment is flagged **Needs refund**, and both the customer and staff are told.
- **Admin → Payments**: deposits in the last 30 days, a "needs refund" count, search and filters, re-check for pending payments, and one-click **refunds through Paystack** (super admins and admins) with an option to release the vehicle. A banner shows when you're in test mode.
- Holds don't expire automatically. Staff set the vehicle back to Available (which clears the hold), or release it as part of a refund.

### Admin dashboard (`/admin`)
- **Dashboard**: inventory counts by status, total and new enquiries, pending and confirmed test drives, recent enquiries, upcoming appointments, most-viewed vehicles and recent activity.
- **Vehicles**: list with search, filters and sort; quick status, publish, feature and delete actions (vehicles with enquiry history are archived instead of deleted). Six-step create/edit form with Cloudinary uploads (signed, then verified server-side for format, size and folder), image reordering and alt text, features, categories, SEO and slug. **CSV export**, and **CSV import** with a preview step, validation, duplicate detection (stock number and VIN, within the file and against the database) and an optional "update existing".
- **Enquiries**: search, plus filters for type, status, date range, assignee and follow-ups due. Detail page with customer, vehicle, type-specific details (including trade-in photos), status changes, follow-up dates, rep assignment, and a communication history (note / call / email / WhatsApp / in person). CSV export.
- **Appointments**: list and weekly calendar. Approve, reject (with a note to the customer), reschedule (conflict-checked), complete (with outcome), no-show, cancel, assign staff.
- **Customers**: search, editable details and notes, full enquiry and appointment history, CSV export.
- **Messages**: contact-form inbox (reply, mark read, archive, convert to enquiry) and newsletter subscribers with CSV export.
- **Content**: homepage (announcement, hero text and image, stats, promo banner), about page (story, mission, vision, image), testimonials, FAQs, team and categories.
- **Settings**: business and contact details, WhatsApp number, map, hours, socials, footer, SEO defaults and share image, currency, locale, mileage unit, time zone, approximate currencies, and an assistant on/off switch.
- **Reports**: enquiries by type and status, conversion rate, vehicles sold and average days to sell, available stock value, most viewed, inventory mix, search analytics (most-filtered makes and body types, keywords, zero-result searches).
- **Users & roles**, **My account** (change password), **Notifications**.

### Roles

| | Super admin | Admin | Sales manager | Sales rep |
| --- | :-: | :-: | :-: | :-: |
| Dashboard, view vehicles, own enquiries & appointments, customers | ● | ● | ● | ● |
| Add / edit vehicles, import, all enquiries, assign leads, reports, exports, messages | ● | ● | ● | – |
| Delete vehicles, content CMS, settings, manage users | ● | ● | – | – |
| Create / edit super admins | ● | – | – | – |

The full matrix is in `lib/auth/permissions.ts` and is also shown on the Users page. Every admin page and every server action checks the user **on the server** (`lib/auth/guards.ts`), re-reading the user from the database, so deactivation and role changes take effect immediately. Middleware is only a first line of defence. There must always be at least one active super admin, and nobody can deactivate themselves or change their own role.

## 4. Project structure

```
app/
  (public)/              Public site: home, inventory, [slug], about, services, financing,
                         trade-in, contact, compare, favourites
  spec-sheet/[slug]/     Printable A4 spec sheet
  admin/(auth)/login/    Sign-in
  admin/(panel)/         Dashboard, vehicles, enquiries, appointments, customers, messages,
                         content, settings, users, reports, notifications, account
  admin/actions/         Server actions: vehicles, leads, content, users
  actions/               Public server actions: leads, newsletter
  api/                   auth, assistant, vehicle cards/views, admin CSV exports
components/              home · inventory · vehicles · forms · layout · admin · shared · ui
lib/
  auth/                  NextAuth options, permissions, server guards
  leads/                 create (transactional lead + emails), scheduling, access scopes, labels
  validations/           Zod schemas (inventory, leads, vehicle, newsletter)
  email/                 Resend client + branded templates
  ai/                    Grounded assistant
  vehicles/              Queries, labels, formatting
  cloudinary.ts csv.ts time.ts currency.ts revalidate.ts activity.ts …
hooks/use-local-list.ts  Favourites / compare / recently viewed storage
prisma/schema.prisma     Full data model · prisma/seed.ts
middleware.ts            Session gate for /admin and /api/admin
```

## 5. Deployment

**Vercel**: import the repo, add the environment variables, then set the Build Command to
`npx prisma migrate deploy && npm run build`.

**Render**: Web Service with Build Command
`npm install && npx prisma migrate deploy && npm run build` and Start Command `npm start`.
The build does **not** seed the database. Run the seed once against the Render database, either from the
service's Shell (`npm run db:seed`) or from your own computer with `DATABASE_URL` and `DIRECT_URL` set to
Render's *External* database URL. Add the Cloudinary keys on Render too, or admin photo uploads are disabled.

**Photos missing after deploy?**
1. Run `npm run check:images` with `DATABASE_URL` set to the live database. "No photos saved" means the seed hasn't run there.
2. If photos are saved but don't show, open one in the browser as `https://your-site/_next/image?url=<photo url>&w=640&q=75`. An error or a long wait means the image resizer is struggling on a small plan: set `IMAGES_UNOPTIMIZED=true` in Render's environment and redeploy.

Notes:
- Rate limiting (`lib/rate-limit-core.ts`) is in-memory per instance. If you run several instances, swap it for a shared store such as Upstash Redis; the call sites stay the same.
- Pages revalidate automatically when admins save changes; time-based revalidation is a fallback.

## 6. Seed data

The seed creates 8 categories, 12 **demo** vehicles with specs and features, 5 FAQs, default settings and your super admin. Replace the demo vehicles with real stock before launch, either by deleting or archiving them, or with CSV import using "update existing". Testimonials, statistics and contact details are deliberately left empty.

### Demo photography & naira on an existing database
- The seed attaches demo photos to every demo vehicle and sets the homepage hero, About and promo images. They're free-to-use Unsplash photos, loaded directly from `images.unsplash.com` (allowed in `next.config.mjs`). Some show a similar car rather than the exact model, so **replace them with photos of your real stock** before launch. If a photo ever fails to load, the site falls back to the styled placeholder automatically.
- **If you already seeded with the old dollar settings**, just run `npm run db:seed` again. It switches the site currency to NGN / `en-NG`, updates the demo vehicles to naira prices, and adds the photos. It won't overwrite images you've already set.

## 7. First-run checklist

1. `npm run typecheck` and `npm run build` pass.
2. Sign in at `/admin`, create a second user per role, and confirm each role sees the right menu.
3. Settings: add phone, WhatsApp, email, address, hours. The contact page, footer and WhatsApp buttons appear.
4. Add a vehicle with photos (Cloudinary) and publish it. It appears on the homepage, in inventory and in the sitemap.
5. Inventory: try each filter, then share a filtered URL in a private window.
6. Vehicle page: submit each enquiry tab. Check the dashboard, the notifications and both emails (Resend).
7. Test drives: book a slot, approve it, then try to approve another booking for the same slot. It must be refused.
8. CSV: export inventory, edit a row, import with preview, then commit.
9. Paystack (test keys): turn on deposits in Settings, reserve a vehicle and pay with Paystack's test card (`4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`). Check that the vehicle becomes Reserved, the payment shows as Paid and the receipt email arrives. Then refund it from Admin → Payments.
10. Check phone layouts, keyboard navigation and the gallery's fullscreen viewer.
