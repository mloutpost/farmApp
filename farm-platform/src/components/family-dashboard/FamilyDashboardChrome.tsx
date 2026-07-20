"use client";

import FamilyDashboardFlyout from "@/components/family-dashboard/FamilyDashboardFlyout";

export default function FamilyDashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FamilyDashboardFlyout />
    </>
  );
}
