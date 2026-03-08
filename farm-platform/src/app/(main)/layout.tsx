"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFarmSync } from "@/hooks/useFarmSync";

const NAV_ITEMS = [
  { href: "/", label: "Map" },
  { href: "/timeline", label: "Timeline" },
  { href: "/flow", label: "Flow" },
  { href: "/settings", label: "Settings" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useFarmSync();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg">
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border bg-bg-elevated/80 backdrop-blur-sm">
        <nav className="flex items-center gap-1" role="navigation" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "text-accent bg-accent/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
          Farm Platform
        </span>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
