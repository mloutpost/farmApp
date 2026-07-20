"use client";

import { useState } from "react";
import { Caveat, Crimson_Pro } from "next/font/google";
import { useFarmStore } from "@/store/farm-store";
import BethJournalPanel from "@/components/beth/BethJournalPanel";
import BethPlantingsPanel from "@/components/beth/BethPlantingsPanel";
import BethFarmPanel from "@/components/beth/BethFarmPanel";
import BethPantryPanel from "@/components/beth/BethPantryPanel";
import BethBedMap from "@/components/beth/BethBedMap";

const bethScript = Caveat({
  subsets: ["latin"],
  variable: "--font-beth-script",
  display: "swap",
});

const bethSerif = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-beth-serif",
  display: "swap",
});

const TABS = [
  { id: "journal", label: "Journal" },
  { id: "plantings", label: "Plantings" },
  { id: "bedmap", label: "Bed map" },
  { id: "gardens", label: "My gardens" },
  { id: "pantry", label: "Pantry" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BethPage() {
  const nodes = useFarmStore((s) => s.nodes);
  const [tab, setTab] = useState<TabId>("journal");

  return (
    <div
      className={`${bethScript.variable} ${bethSerif.variable} h-full min-h-0 overflow-y-auto bg-[#f4e9d8] text-stone-900 [--beth-paper:#faf6ef]`}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 pb-16">
        <header className="mb-8 border-b border-amber-900/20 pb-6">
          <h1 className="font-[family-name:var(--font-beth-script)] text-4xl text-amber-950 sm:text-5xl">
            Beth&apos;s Page
          </h1>
          <p className="mt-2 font-[family-name:var(--font-beth-serif)] text-stone-700">
            Notes and pantry stay here; plantings and beds stay with the farm map.
          </p>
        </header>

        <div
          className="mb-6 flex flex-wrap gap-1 rounded-lg bg-[#ebe0cf] p-1 shadow-inner"
          role="tablist"
          aria-label="Beth page sections"
        >
          {TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={`min-h-[44px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                  selected
                    ? "bg-[#fffdf8] text-amber-950 shadow-sm"
                    : "text-stone-600 hover:bg-[#faf6ef]/80"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <section
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="rounded-xl border border-amber-900/15 bg-[#fffdf8]/95 p-4 shadow-md sm:p-6"
        >
          {tab === "journal" && <BethJournalPanel />}
          {tab === "plantings" && <BethPlantingsPanel />}
          {tab === "bedmap" && <BethBedMap nodes={nodes} />}
          {tab === "gardens" && <BethFarmPanel />}
          {tab === "pantry" && <BethPantryPanel />}
        </section>
      </div>
    </div>
  );
}
