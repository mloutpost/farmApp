"use client";

import { useEffect, useState } from "react";
import { useUsageStore } from "@/store/usage-store";
import { MAPBOX_LIMITS } from "@/lib/mapbox-usage";

const DASHBOARD_URL = "https://account.mapbox.com/statistics/";

export default function MapboxUsageAlert() {
  const { mapLoads, limit, percentUsed, level, refresh } = useUsageStore();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (level === "ok" || dismissed) return null;

  const config = {
    warn: {
      icon: "⚠️",
      title: "Approaching Mapbox free tier limit",
      message: `You've used ~${mapLoads.toLocaleString()} of ${limit.toLocaleString()} monthly map loads (${Math.round(percentUsed)}%). Consider monitoring usage to avoid overage.`,
      bg: "bg-amber-500/15 border-amber-500/40 text-amber-200",
    },
    critical: {
      icon: "🔴",
      title: "Near Mapbox free tier limit",
      message: `~${mapLoads.toLocaleString()} map loads used (${Math.round(percentUsed)}%). You may exceed the ${limit.toLocaleString()}/month free tier soon.`,
      bg: "bg-orange-500/15 border-orange-500/40 text-orange-200",
    },
    over: {
      icon: "⛔",
      title: "Mapbox free tier exceeded",
      message: `Estimated usage (~${mapLoads.toLocaleString()} loads) exceeds the free tier. Map may stop working. Check your Mapbox dashboard.`,
      bg: "bg-red-500/15 border-red-500/40 text-red-200",
    },
  }[level];

  return (
    <div
      className={`absolute left-4 right-4 top-4 z-20 flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${config.bg}`}
    >
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{config.title}</p>
        <p className="mt-0.5 text-sm opacity-90">{config.message}</p>
        <a
          href={DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium underline underline-offset-2 hover:no-underline"
        >
          View Mapbox usage →
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
