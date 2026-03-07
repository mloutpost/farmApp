"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import type { NavId } from "@/components/sidebar/Sidebar";

function pathToNav(pathname: string): NavId {
  if (pathname.startsWith("/nodes")) return "nodes";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/layers")) return "layers";
  if (pathname.startsWith("/crops")) return "crops";
  if (pathname.startsWith("/photos")) return "photos";
  return "map";
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathToNav(pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar active={active} useRouter />
      {children}
    </div>
  );
}
