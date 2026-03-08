"use client";

import { useFarmStore } from "@/store/farm-store";

interface FrostPlantingProps {
  daysToMaturity?: number;
  datePlanted?: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FrostPlanting({ daysToMaturity, datePlanted }: FrostPlantingProps) {
  const profile = useFarmStore((s) => s.profile);

  if (!profile.lastFrostSpring && !profile.firstFrostFall) {
    return (
      <p className="text-xs text-text-muted italic">
        Set frost dates in Settings to see planting windows.
      </p>
    );
  }

  const lastFrost = profile.lastFrostSpring;
  const firstFrost = profile.firstFrostFall;
  const dtm = daysToMaturity ?? 90;

  const suggestions: Array<{ label: string; date: string; warning?: boolean }> = [];

  if (lastFrost) {
    suggestions.push({ label: "Start indoors by", date: addDays(lastFrost, -dtm + 42) });
    suggestions.push({ label: "Direct sow after", date: addDays(lastFrost, 14) });
  }

  if (datePlanted) {
    suggestions.push({ label: "Expected harvest", date: addDays(datePlanted, dtm) });
  } else if (lastFrost) {
    suggestions.push({ label: "Est. harvest (if sow after frost)", date: addDays(lastFrost, 14 + dtm) });
  }

  if (firstFrost && datePlanted) {
    const harvestDate = new Date(addDays(datePlanted, dtm));
    const frostDate = new Date(firstFrost);
    if (harvestDate > frostDate) {
      suggestions.push({ label: "Warning: harvest after first frost!", date: firstFrost, warning: true });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <div
          key={s.label}
          className={`rounded-md px-2.5 py-1.5 text-xs ${
            s.warning ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
          }`}
        >
          <span className="font-medium">{s.label}:</span> {formatDate(s.date)}
        </div>
      ))}
    </div>
  );
}
