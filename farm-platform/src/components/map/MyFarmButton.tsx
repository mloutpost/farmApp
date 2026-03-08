"use client";

import { useFarmStore } from "@/store/farm-store";

export default function MyFarmButton({ onClick }: { onClick: () => void }) {
  const profile = useFarmStore((s) => s.profile);
  const nodeCount = useFarmStore((s) => s.nodes.length);

  return (
    <button
      onClick={onClick}
      title="My Farm — manage nodes"
      className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated/95 px-3 py-2 text-xs font-medium text-text-primary shadow-md backdrop-blur-sm hover:bg-bg-elevated transition-colors"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      {profile.name || "My Farm"}
      {nodeCount > 0 && (
        <span className="ml-0.5 rounded-full bg-accent/20 text-accent px-1.5 py-px text-[10px] font-semibold">
          {nodeCount}
        </span>
      )}
    </button>
  );
}
