"use client";

import Link from "next/link";
import { useState } from "react";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { FinancingForm } from "@/components/forms/financing-form";
import { ReservationPaymentForm } from "@/components/forms/reservation-payment-form";
import { TestDriveForm } from "@/components/forms/test-drive-form";
import { cn } from "@/lib/utils";

type Tab = "enquire" | "test-drive" | "finance" | "reserve";

interface EnquiryPanelProps {
  vehicle: { id: string; slug: string; title: string; stockNumber: string; priceLabel: string; available: boolean; reservable: boolean };
  minDate: string;
  maxDate: string;
  currencyLabel: string;
  /** Set when online reservation deposits (Paystack) are available for this vehicle. */
  deposit?: { label: string; holdDays: number } | null;
}

/** Tabbed enquiry panel on the vehicle page. The vehicle is attached automatically. */
export function EnquiryPanel({ vehicle, minDate, maxDate, currencyLabel, deposit }: EnquiryPanelProps) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "enquire", label: "Enquire" },
    ...(vehicle.available ? [{ id: "test-drive" as const, label: "Test drive" }] : []),
    { id: "finance", label: "Finance" },
    ...(vehicle.reservable ? [{ id: "reserve" as const, label: deposit ? "Reserve online" : "Reserve" }] : []),
  ];
  const [tab, setTab] = useState<Tab>("enquire");

  return (
    <div id="enquire" className="scroll-mt-28 bg-obsidian p-6 text-white sm:p-8">
      <div className="mb-5 flex flex-col gap-1.5">
        <span className="eyebrow text-champagne">Enquire about this vehicle</span>
        <span className="text-sm text-mist">
          {vehicle.title} · {vehicle.stockNumber}
        </span>
      </div>
      <div role="tablist" aria-label="Enquiry type" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[44px] border text-[13px] font-semibold transition-colors",
              tab === t.id ? "border-champagne bg-champagne text-obsidian" : "border-graphite-muted hover:border-champagne",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "enquire" ? (
          <EnquiryForm
            tone="dark"
            defaultType="VEHICLE"
            types={["VEHICLE", "CALLBACK", "INSPECTION"]}
            vehicle={{ id: vehicle.id, title: vehicle.title, stockNumber: vehicle.stockNumber }}
            source="vehicle_page"
          />
        ) : null}
        {tab === "test-drive" ? <TestDriveForm tone="dark" vehicle={{ id: vehicle.id, title: vehicle.title }} minDate={minDate} maxDate={maxDate} /> : null}
        {tab === "finance" ? (
          <FinancingForm tone="dark" vehicle={{ id: vehicle.id, label: vehicle.title, priceLabel: vehicle.priceLabel }} currencyLabel={currencyLabel} />
        ) : null}
        {tab === "reserve" && deposit ? (
          <ReservationPaymentForm vehicle={{ id: vehicle.id, title: vehicle.title }} depositLabel={deposit.label} holdDays={deposit.holdDays} />
        ) : null}
        {tab === "reserve" && !deposit ? (
          <EnquiryForm
            tone="dark"
            defaultType="RESERVATION"
            vehicle={{ id: vehicle.id, title: vehicle.title, stockNumber: vehicle.stockNumber }}
            source="vehicle_page"
            submitLabel="Request reservation"
            defaultMessage={`I'd like to reserve the ${vehicle.title} (${vehicle.stockNumber}).`}
          />
        ) : null}
      </div>
      <p className="mt-6 border-t border-graphite-line pt-4 text-sm text-mist">
        Have a vehicle to trade in?{" "}
        <Link href={`/trade-in?vehicle=${vehicle.slug}`} className="font-semibold text-champagne underline-offset-4 hover:underline">
          Get a trade-in valuation
        </Link>
      </p>
    </div>
  );
}
