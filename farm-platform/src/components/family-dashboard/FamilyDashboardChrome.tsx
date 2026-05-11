"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { getRosaryForDate } from "@/lib/family-dashboard/rosary";
import { useFamilyDashboardUiStore } from "@/store/family-dashboard-ui-store";
import { RosaryMysteryOverlay } from "@/components/family-dashboard/RosaryOverlay";
import FamilyDashboardFlyout from "@/components/family-dashboard/FamilyDashboardFlyout";

export default function FamilyDashboardChrome({ children }: { children: React.ReactNode }) {
  const rosaryOpen = useFamilyDashboardUiStore((s) => s.rosaryOpen);
  const setRosaryOpen = useFamilyDashboardUiStore((s) => s.setRosaryOpen);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const rosaryDay = useMemo(() => getRosaryForDate(now), [now]);

  return (
    <>
      {children}
      <FamilyDashboardFlyout />
      {rosaryOpen
        ? createPortal(
            <RosaryMysteryOverlay rosaryDay={rosaryDay} onClose={() => setRosaryOpen(false)} />,
            document.body
          )
        : null}
    </>
  );
}
