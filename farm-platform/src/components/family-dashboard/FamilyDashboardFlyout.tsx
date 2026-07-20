"use client";

import Link from "next/link";
import { useState } from "react";
import FamilyDashboardSettingsDialog from "@/components/family-dashboard/FamilyDashboardSettingsDialog";
import { PROVENCE } from "@/lib/family-dashboard/dashboard-tokens";

const linkClass =
  "rounded-sm border px-2 py-2.5 text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] transition-opacity hover:opacity-90";

const linkStyle = {
  borderColor: PROVENCE.toileBlueDeep,
  color: PROVENCE.toileBlueDeep,
  background: "rgba(255,250,238,0.96)",
} as const;

/** Discrete right-edge tab: expand for settings, travel, and quick links. */
export default function FamilyDashboardFlyout() {
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        className="pointer-events-auto fixed right-0 top-1/2 z-[10001] flex -translate-y-1/2"
        style={{ fontFamily: "Georgia, serif" }}
      >
        <div
          className={`flex flex-col items-stretch gap-2 rounded-l-md border bg-[#fdf8ee]/95 shadow-lg transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none ${
            expanded ? "w-[11.75rem] py-3 pl-2 pr-2" : "w-7 py-4 pl-0.5 pr-0.5"
          }`}
          style={{
            borderColor: `${PROVENCE.toileBlueDeep}44`,
            backdropFilter: "blur(6px)",
          }}
        >
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse tools" : "Expand tools"}
            onClick={() => setExpanded((e) => !e)}
            className="mx-auto flex h-8 w-6 shrink-0 items-center justify-center rounded-sm text-[#1f3a55]/35 transition-colors hover:text-[#1f3a55]/75"
          >
            <span className="select-none text-[15px] leading-none" aria-hidden>
              {expanded ? "›" : "‹"}
            </span>
          </button>
          {expanded ? (
            <>
              <button
                type="button"
                className={linkClass}
                style={linkStyle}
                onClick={() => {
                  setSettingsOpen(true);
                  setExpanded(false);
                }}
              >
                Accounts
              </button>
              <Link
                href="/family-dashboard/handwriting"
                className={linkClass}
                style={linkStyle}
                onClick={() => setExpanded(false)}
              >
                Handwriting
              </Link>
              <Link
                href="/family-dashboard/travel-planning"
                className={linkClass}
                style={linkStyle}
                onClick={() => setExpanded(false)}
              >
                Travel planning
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <FamilyDashboardSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
