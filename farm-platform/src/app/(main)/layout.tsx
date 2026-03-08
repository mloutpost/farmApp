"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFarmSync } from "@/hooks/useFarmSync";
import LoadDemoBanner from "@/components/LoadDemoBanner";
import UserMenu from "@/components/UserMenu";
import PersistentMap from "@/components/map/PersistentMap";
import UndoManager from "@/components/UndoManager";

const NAV_ITEMS = [
  { href: "/", label: "Map" },
  { href: "/flow", label: "Nodes" },
  { href: "/calendar", label: "Planner" },
  { href: "/finances", label: "Finances" },
  { href: "/timeline", label: "Timeline" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useFarmSync();
  const isMapPage = pathname === "/";

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
        <UserMenu />
      </header>
      <LoadDemoBanner />
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <PersistentMap visible={isMapPage} />
        {!isMapPage && children}
      </main>
      <UndoManager />
    </div>
  );
}
