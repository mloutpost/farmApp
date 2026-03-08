"use client";

import React from "react";
import { useSubscriptionStore } from "@/store/subscription-store";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FEATURE_LABELS: Record<string, { title: string; description: string }> = {
  calendar: {
    title: "Planting Calendar",
    description: "Plan your season with smart frost-date scheduling and visual timelines.",
  },
  tasks: {
    title: "Task Manager",
    description: "Track recurring chores, assign work, and never miss a deadline.",
  },
  reports: {
    title: "Farm Reports",
    description: "Generate yield summaries, season comparisons, and printable field reports.",
  },
  financials: {
    title: "Financial Tracking",
    description: "Log expenses and revenue, view profit margins, and export for tax time.",
  },
  "soil-tracking": {
    title: "Soil Health Tracker",
    description: "Record soil tests over time and track amendments for every field and bed.",
  },
  "weather-enhanced": {
    title: "Enhanced Weather",
    description: "Hyperlocal forecasts, frost alerts, and growing-degree-day tracking.",
  },
  "ai-recommendations": {
    title: "AI Recommendations",
    description: "Get personalized planting, rotation, and amendment suggestions.",
  },
  "pdf-export": {
    title: "PDF Export",
    description: "Export maps, logs, and reports as polished PDF documents.",
  },
  "team-collaboration": {
    title: "Team Collaboration",
    description: "Share your farm with crew members, assign roles, and sync in real time.",
  },
  "multi-user": {
    title: "Multi-User Access",
    description: "Invite multiple users with granular permissions across your farms.",
  },
};

function DefaultUpgradePrompt({ feature }: { feature: string }) {
  const meta = FEATURE_LABELS[feature];
  const title = meta?.title ?? feature.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const description = meta?.description ?? "Unlock this feature and more with a Pro subscription.";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-elevated px-8 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-elevated">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-text-secondary"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <span className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">
        Pro Feature
      </span>

      <h3 className="mb-2 text-lg font-bold text-text-primary">{title}</h3>

      <p className="mb-6 max-w-xs text-sm leading-relaxed text-text-secondary">
        {description}
      </p>

      <button
        type="button"
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasFeature = useSubscriptionStore((s) => s.hasFeature);

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <>{fallback ?? <DefaultUpgradePrompt feature={feature} />}</>;
}
