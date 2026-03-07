"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { id: "map", label: "Map", icon: MapIcon, href: "/" },
  { id: "nodes", label: "Nodes", icon: NodesIcon, href: "/nodes" },
  { id: "layers", label: "Layers", icon: LayersIcon, href: "/layers" },
  { id: "crops", label: "Crops", icon: CropIcon, href: "/crops" },
  { id: "photos", label: "Photos", icon: PhotoIcon, href: "/photos" },
  { id: "settings", label: "Settings", icon: SettingsIcon, href: "/settings" },
] as const;

export type NavId = (typeof navItems)[number]["id"];

interface SidebarProps {
  active: NavId;
  useRouter?: boolean;
  onNavigate?: (id: NavId) => void;
}

export default function Sidebar({ active, useRouter, onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`flex h-full flex-col border-r border-border bg-bg-elevated transition-all duration-200 ${
        expanded ? "w-56" : "w-14"
      }`}
    >
      <div className="flex h-14 items-center justify-center border-b border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-accent hover:bg-bg-surface transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const className = `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all w-full ${
            isActive
              ? "bg-accent/10 text-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
          }`;
          return useRouter ? (
            <Link key={item.id} href={item.href} className={className}>
              <Icon size={18} />
              {expanded && <span>{item.label}</span>}
            </Link>
          ) : (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={className}
            >
              <Icon size={18} />
              {expanded && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
          <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">F</span>
          </div>
          {expanded && (
            <span className="text-xs font-medium text-text-secondary truncate">
              Farm Platform
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

function MapIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function NodesIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function LayersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function CropIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </svg>
  );
}

function PhotoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function SettingsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
