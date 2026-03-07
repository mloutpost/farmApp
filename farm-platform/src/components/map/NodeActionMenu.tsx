"use client";

import { useState } from "react";
import { useMapStore } from "@/store/map-store";

const ACTIONS = [
  { id: "manage", label: "Manage", icon: "⚙" },
  { id: "move", label: "Move", icon: "↔" },
  { id: "rename", label: "Rename", icon: "✏" },
  { id: "delete", label: "Delete", icon: "🗑" },
];

export default function NodeActionMenu() {
  const [open, setOpen] = useState(false);
  const { selectedMapNodeId, setSelectedMapNode } = useMapStore();

  if (!selectedMapNodeId) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg overflow-hidden w-48">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold text-text-primary">Node Action Menu</span>
        <button
          onClick={() => setSelectedMapNode(null)}
          className="text-text-muted hover:text-text-primary p-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-2">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
