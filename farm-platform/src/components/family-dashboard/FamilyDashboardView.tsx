"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EB_Garamond, Cormorant_Garamond } from "next/font/google";
import { dashboardLatLon, fetchWeatherBrief } from "@/lib/family-dashboard/weather";
import { PROVENCE, PARCHMENT_TEXTURE } from "@/lib/family-dashboard/dashboard-tokens";
import { fetchGuerangerForDay, type GuerangerDayJson } from "@/lib/family-dashboard/gueranger";
import { getPlaceholderFeast } from "@/lib/family-dashboard/placeholder-feasts";
import { useLiturgicalYearStore } from "@/store/liturgical-year-store";
import { useLiturgicalYearSync } from "@/hooks/useLiturgicalYearSync";
import { useGoogleCalendarStore } from "@/store/google-calendar-store";
import { useTodayEvents } from "@/hooks/useTodayEvents";
import {
  calendarConsoleEnableLink,
  formatEventTimeChip,
  type GoogleCalendarEvent,
} from "@/lib/family-dashboard/google-calendar";

const dashboardSerif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-dashboard-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const dashboardDisplaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-dashboard-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

/* ---------- Date / format helpers ---------- */

/**
 * Two-line date for the cartouche header: a small letterspaced weekday
 * eyebrow ("SUNDAY") above a generous title-cased display date
 * ("May 10, 2026"). Stacking lets the date occupy the same two-line
 * vertical rhythm as the weather block on the opposite flank, so both
 * side zones share a single baseline with the center medallion.
 */
function formatHeaderDate(d: Date): { weekday: string; display: string } {
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const display = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return { weekday, display };
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthDay(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Match the reference style: "SUNNY, 62°F | LO: 48°F". */
function asReferenceWeather(line: string): string {
  // line from fetchWeatherBrief looks like "Clear, 72°F | Lo: 58°F | Hi: 80°F"
  return line
    .replace(/Lo:/gi, "LO:")
    .replace(/Hi:/gi, "HI:")
    .toUpperCase();
}

/**
 * Split the single weather line ("CLEAR, 73°F | LO: 50°F | HI: 73°F")
 * into a compact two-line stack:
 *   primary   — "CLEAR · 73°F"          (display tier, peer to date)
 *   secondary — "LO 50° · HI 73°"       (eyebrow tier, peer to weekday)
 * Falls back to a single-line render when the source string doesn't
 * have the pipe-separated shape (loading state, "Weather unavailable").
 */
function splitWeatherLine(line: string): { primary: string; secondary: string } {
  if (!line || line === "…") return { primary: line, secondary: "" };
  const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { primary: line, secondary: "" };
  const primary = parts[0].replace(/,\s*/, " · ");
  const secondary = parts
    .slice(1)
    .map((p) => p.replace(/:\s*/, " ").replace(/°F/g, "°"))
    .join(" · ");
  return { primary, secondary };
}

/* Today's calendar uses Google Calendar; helpers live with that data source. */

/* ---------- Provence palette (see dashboard-tokens) ---------- */

/** +20% UI scale via `zoom` on the foreground column only (background stays full-bleed). */
const DASHBOARD_UI_ZOOM = 1.2;

/**
 * Drop shadow on cartouche header text: slightly layered so scaled-up type
 * stays crisp on the blue field.
 */
const HEADER_TEXT_SHADOW =
  "0 1px 0 rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.22)";

/** Read the element currently in fullscreen (standard + Safari). */
function getFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/**
 * Try true browser fullscreen on `shell`. Returns whether the call
 * succeeded (promise resolves and element reports as fullscreen).
 * Many mobile browsers / in-app webviews block this — callers should
 * fall back to a fixed-position "immersive" overlay.
 */
async function tryNativeFullscreen(shell: HTMLElement): Promise<boolean> {
  if (getFullscreenElement() === shell) return true;
  try {
    if (typeof shell.requestFullscreen === "function") {
      await shell.requestFullscreen();
      return getFullscreenElement() === shell;
    }
    type WebKitEl = HTMLElement & { webkitRequestFullscreen?: () => void };
    const w = shell as WebKitEl;
    if (typeof w.webkitRequestFullscreen === "function") {
      w.webkitRequestFullscreen();
      // Legacy WebKit fills `fullscreenElement` on the next frame(s).
      for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        if (getFullscreenElement() === shell) return true;
      }
      return false;
    }
  } catch {
    /* blocked or unsupported */
  }
  return false;
}


/* ---------- Panel nameplate (hand-painted label) ---------- */

/**
 * A small ink flourish drawn at the end of a hand-written nameplate. Two
 * short scrolls flanking a tiny dot — used like the printers' fleurons that
 * decorate antique title pages.
 */
function NameplateFlourish({
  className = "",
  flipped = false,
}: {
  className?: string;
  flipped?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 18"
      aria-hidden
      className={className}
      fill="none"
      stroke={PROVENCE.toileBlueDeep}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flipped ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M 0 9 q 8 -2 12 0 q 4 2 8 0 q 4 -2 12 0" strokeWidth="0.8" />
      <path d="M 4 7 q 3 -4 6 -3 t 4 4" strokeWidth="0.6" opacity="0.7" />
      <circle cx="22" cy="9" r="1" fill={PROVENCE.toileBlueDeep} stroke="none" />
      <circle cx="32" cy="9" r="0.7" fill={PROVENCE.toileBlueDeep} stroke="none" />
    </svg>
  );
}

/**
 * Replaces the solid-blue gradient panel header with something that reads
 * as a hand-inked label on aged paper: italic Cormorant title in toile-blue,
 * flanked by small ink flourishes, with a faded double-rule divider underneath.
 * No solid color block, so the panel's parchment color is continuous.
 */
function PanelNameplate({
  children,
  titleClassName = "",
}: {
  children: React.ReactNode;
  /** Extra classes for the title line(s) (e.g. tighter tracking for long labels). */
  titleClassName?: string;
}) {
  return (
    <div
      className="relative isolate min-w-0 overflow-hidden pb-3 pt-3 px-4 sm:px-5 rounded-t-[2px]"
      style={{
        // Subtle warm wash so the title area is just a touch lighter than
        // the panel body, like the top of a book page.
        background:
          `linear-gradient(180deg, rgba(216,195,154,0.55) 0%, rgba(245,234,208,0) 100%)`,
      }}
    >
      <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
        <NameplateFlourish className="hidden h-3 w-9 shrink-0 opacity-75 sm:block" />
        <h2
          className={
            "min-w-0 text-center text-[15px] tracking-[0.1em] sm:text-base sm:tracking-[0.12em] leading-snug " +
            titleClassName
          }
          style={{
            color: PROVENCE.toileBlueDeep,
            fontFamily: "var(--font-dashboard-display), Georgia, serif",
            fontStyle: "italic",
            fontWeight: 600,
            textShadow: "0 1px 0 rgba(255,247,225,0.7)",
          }}
        >
          {children}
        </h2>
        <NameplateFlourish className="hidden h-3 w-9 shrink-0 opacity-75 sm:block" flipped />
      </div>
      {/* Organic double-rule: keep in-flow (not absolutely positioned). In narrow
          flex panels, absolutely positioned descendants + preserveAspectRatio="none"
          can incorrectly resolve width to the row/viewport instead of the card,
          producing one long line spanning both tiles. */}
      <div className="mt-2 block min-w-0 max-w-full">
        <svg
          aria-hidden
          viewBox="0 0 320 8"
          preserveAspectRatio="none"
          className="pointer-events-none block h-[7px] w-full overflow-hidden"
        >
          <path
            d="M 4 2 q 80 -1.5 156 0 t 156 0"
            stroke={PROVENCE.toileBlueDeep}
            strokeWidth="0.9"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M 8 6 q 76 -1 152 0 t 152 0"
            stroke={PROVENCE.toileBlueDeep}
            strokeWidth="0.4"
            fill="none"
            opacity="0.55"
          />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Pull quote (featured body content) ---------- */

function extractFirstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = t.match(/^[^.!?]+[.!?]+(?:["'\u201D\u2019\u00BB])?/);
  return (m?.[0] ?? t).trim();
}

function PullQuote({
  quote,
  attributionFeast,
}: {
  quote: string;
  attributionFeast?: string;
}) {
  const displayFamily = "var(--font-dashboard-display), Georgia, 'EB Garamond', serif";
  return (
    <figure className="relative flex h-full w-full flex-col items-center justify-center px-2 py-2 sm:px-4 sm:py-3">
      <span
        aria-hidden
        className="absolute -top-3 left-1 sm:left-2 select-none text-[5rem] sm:text-[6.5rem] leading-none text-[#c9a227]/55"
        style={{ fontFamily: displayFamily }}
      >
        “
      </span>
      <span
        aria-hidden
        className="absolute -bottom-6 right-1 sm:right-2 select-none text-[5rem] sm:text-[6.5rem] leading-none text-[#c9a227]/55"
        style={{ fontFamily: displayFamily }}
      >
        ”
      </span>
      <blockquote
        className="max-w-[min(92%,56ch)] text-center text-[#1a1510] text-[1.15rem] sm:max-w-[min(90%,64ch)] sm:text-[1.35rem] lg:max-w-[min(95%,72ch)] lg:text-[1.5rem] xl:text-[1.65rem] leading-[1.3] tracking-[0.005em] italic"
        style={{ fontFamily: displayFamily, fontWeight: 500 }}
      >
        {quote}
      </blockquote>
      <figcaption className="mt-3 sm:mt-4 flex flex-col items-center gap-0.5 text-[#5b3a1c]">
        <span className="h-px w-12 bg-[#c9a227]/60" aria-hidden />
        <span className="text-[0.62rem] sm:text-[0.7rem] tracking-[0.3em] uppercase">
          Dom Prosper Guéranger
        </span>
        {attributionFeast && (
          <span
            className="mt-0.5 text-[0.6rem] sm:text-[0.66rem] tracking-[0.2em] uppercase"
            style={{ color: PROVENCE.toileBlueDeep }}
          >
            {attributionFeast}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** Subtle vineyard hill + chapel silhouette, painted in the existing palette. */
function PastoralSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 120"
      preserveAspectRatio="xMidYMax meet"
      className={`text-[#3d2410] ${className}`}
      aria-hidden
      fill="currentColor"
    >
      {/* far hill */}
      <path d="M0 80 C 90 50, 180 60, 260 70 C 340 80, 420 60, 520 65 C 560 67, 590 75, 600 78 L 600 120 L 0 120 Z" opacity="0.55" />
      {/* near hill */}
      <path d="M0 100 C 80 78, 160 82, 240 92 C 320 102, 420 86, 520 92 C 560 95, 590 100, 600 102 L 600 120 L 0 120 Z" />
      {/* cypress trees, left */}
      <ellipse cx="60" cy="92" rx="3.5" ry="14" />
      <ellipse cx="72" cy="90" rx="3" ry="16" />
      <ellipse cx="84" cy="93" rx="3.5" ry="13" />
      {/* chapel */}
      <g transform="translate(286 64)">
        <rect x="0" y="14" width="28" height="22" />
        <polygon points="0,14 14,0 28,14" />
        <rect x="12.5" y="-8" width="3" height="10" />
        <rect x="11" y="-10" width="6" height="2" />
        <rect x="10.5" y="-2" width="7" height="2" />
      </g>
      {/* vineyard rows on the right hillside */}
      <g opacity="0.7">
        <line x1="430" y1="92" x2="500" y2="80" stroke="currentColor" strokeWidth="1" />
        <line x1="438" y1="96" x2="508" y2="84" stroke="currentColor" strokeWidth="1" />
        <line x1="446" y1="100" x2="516" y2="88" stroke="currentColor" strokeWidth="1" />
        <line x1="454" y1="104" x2="524" y2="92" stroke="currentColor" strokeWidth="1" />
      </g>
    </svg>
  );
}

/* ---------- Today's Schedule (Google Calendar) ---------- */

/**
 * Connect-to-Google button, shared by the empty / error states.
 *
 * Why this exists: GIS takes ~200-1500 ms to load on first paint, and
 * during that window the button has to be disabled (the popup must
 * fire synchronously from the click handler — we can't open it before
 * the token client is primed). The previous implementation just
 * showed grey-out text, which made users think the page was broken
 * and click repeatedly into the void. This variant gives the loading
 * state a tiny pulsing dot + clearer copy so the wait reads as
 * intentional, then snaps to a fully-styled call-to-action the moment
 * GIS is ready.
 *
 * Variants:
 *   - "solid":   primary CTA on the not-yet-connected state.
 *   - "outline": secondary CTA on the error / retry state.
 */
function ConnectButton({
  variant,
  gisReady,
  onClick,
  readyLabel,
}: {
  variant: "solid" | "outline";
  gisReady: boolean;
  onClick: () => void;
  readyLabel: string;
}) {
  const isSolid = variant === "solid";
  const baseClasses =
    "min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-wait";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!gisReady}
      aria-busy={!gisReady}
      className={
        baseClasses +
        (isSolid
          ? " hover:opacity-90 disabled:opacity-70"
          : " border-2 bg-[#fffaee] hover:opacity-80 disabled:opacity-70")
      }
      style={
        isSolid
          ? { background: PROVENCE.toileBlueDeep, color: PROVENCE.toileCream }
          : { borderColor: PROVENCE.toileBlueDeep, color: PROVENCE.toileBlueDeep }
      }
    >
      {!gisReady && (
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{
            background: isSolid ? PROVENCE.toileCream : PROVENCE.toileBlueDeep,
            opacity: 0.6,
          }}
        />
      )}
      <span>{gisReady ? readyLabel : "Preparing Google sign-in…"}</span>
    </button>
  );
}

function ScheduleEmpty({
  configured,
  hasConsented,
  status,
  error,
  onConnect,
  gisReady,
}: {
  configured: boolean;
  hasConsented: boolean;
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  onConnect: () => void;
  gisReady: boolean;
}) {
  if (!configured) {
    return (
      <div className="px-5 py-5 text-center text-[#5b4a36] font-serif text-sm break-words">
        Google Calendar isn&apos;t configured yet. Set the OAuth client ID in{" "}
        <code className="bg-[#e5d8b5] px-1 rounded text-xs">.env.local</code> to show your day
        here.
      </div>
    );
  }
  if (status === "connecting") {
    return <p className="px-4 py-5 text-center text-[#5b4a36] font-serif text-sm">Loading…</p>;
  }
  if (status === "error") {
    const enableUrl = error ? calendarConsoleEnableLink(error) : null;
    return (
      <div className="px-4 py-5 text-center font-serif text-sm sm:px-6 sm:py-6 space-y-3">
        <p style={{ color: PROVENCE.toileRed }}>Couldn&apos;t reach Google Calendar.</p>
        {enableUrl ? (
          <div
            className="rounded-sm border px-4 py-3 text-left mx-auto max-w-[20rem]"
            style={{
              borderColor: `${PROVENCE.toileBlueDeep}55`,
              background: "rgba(255,250,238,0.95)",
            }}
          >
            <p className="text-[#1a1510] text-[13px] leading-snug">
              Calendar API isn&apos;t turned on for the Google&nbsp;Cloud project tied to your
              OAuth&nbsp;client. Enable it once in Console (project owner), wait a minute, then&nbsp;
              <strong className="font-semibold">Try again</strong>.
            </p>
            <a
              href={enableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border px-3 text-[11px] font-semibold tracking-[0.12em] uppercase no-underline hover:opacity-90"
              style={{
                borderColor: PROVENCE.toileBlueDeep,
                background: PROVENCE.toileBlueDeep,
                color: PROVENCE.toileCream,
              }}
            >
              Enable Calendar API
            </a>
          </div>
        ) : error ? (
          <p className="text-[#5b4a36] text-xs break-words leading-relaxed">{error}</p>
        ) : null}
        <ConnectButton
          variant="outline"
          gisReady={gisReady}
          onClick={onConnect}
          readyLabel="Try again"
        />
      </div>
    );
  }
  if (!hasConsented) {
    return (
      <div className="px-4 py-5 text-center font-serif text-sm space-y-3">
        <p className="text-[#5b4a36]">
          Connect Google Calendar to show today&apos;s schedule for the family.
        </p>
        <ConnectButton
          variant="solid"
          gisReady={gisReady}
          onClick={onConnect}
          readyLabel="Connect Google Calendar"
        />
      </div>
    );
  }
  return (
    <p className="px-4 py-5 text-center text-[#5b4a36] font-serif text-sm">
      Nothing on the calendar today. A quiet day at home.
    </p>
  );
}

function ScheduleRow({ event }: { event: GoogleCalendarEvent }) {
  return (
    <li className="flex items-start gap-0 py-2.5 pl-3 pr-3 leading-snug sm:pl-3.5 sm:pr-3.5">
      <span
        className="w-[3.65rem] shrink-0 border-r border-[#6b4c2c]/20 pr-1.5 text-right text-[11px] font-semibold uppercase tabular-nums leading-tight sm:w-[3.85rem] sm:text-xs sm:pr-2"
        style={{ color: event.allDay ? PROVENCE.toileRed : PROVENCE.toileBlueDeep }}
      >
        {formatEventTimeChip(event)}
      </span>
      <div className="min-w-0 flex-1 pl-2 sm:pl-2.5">
        <span className="block break-words font-serif text-[#1a1510]">{event.summary || "(no title)"}</span>
        {event.location && (
          <span className="mt-0.5 block text-xs text-[#5b4a36]/85">{event.location}</span>
        )}
      </div>
    </li>
  );
}

function ScheduleBody({
  events,
  status,
  error,
  hasConsented,
  configured,
  onConnect,
  gisReady,
}: {
  events: GoogleCalendarEvent[];
  status: "idle" | "connecting" | "connected" | "error";
  error: string | null;
  hasConsented: boolean;
  configured: boolean;
  onConnect: () => void;
  gisReady: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[9rem] flex-col justify-center py-4">
        <ScheduleEmpty
          configured={configured}
          hasConsented={hasConsented}
          status={status}
          error={error}
          onConnect={onConnect}
          gisReady={gisReady}
        />
      </div>
    );
  }
  // Order: all-day pinned to the top, then chronological.
  const sorted = [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.start.localeCompare(b.start);
  });
  return (
    <ul className="divide-y divide-[#6b4c2c]/20 font-serif text-[15px] sm:text-base text-[#1a1510]">
      {sorted.map((ev) => (
        <ScheduleRow key={ev.id} event={ev} />
      ))}
    </ul>
  );
}

/* ---------- Main view ---------- */

export default function FamilyDashboardView() {
  const shellRef = useRef<HTMLDivElement>(null);
  /** True when this shell is the document's native fullscreen element. */
  const [fullscreen, setFullscreen] = useState(false);
  /** CSS fixed overlay when the Fullscreen API is unavailable or fails (common on iOS / WebViews). */
  const [immersiveFallback, setImmersiveFallback] = useState(false);

  const [now, setNow] = useState(() => new Date());
  const [weatherLine, setWeatherLine] = useState<string>("…");
  const [gueranger, setGueranger] = useState<GuerangerDayJson | null | undefined>(undefined);

  const todayIso = isoDate(now);
  const liturgicalEntry = useLiturgicalYearStore((s) => s.entries[todayIso]);
  // Keep the Zustand store synced with Firestore so the morning email
  // (saved by the feed page or the import script) reaches the TV live.
  useLiturgicalYearSync();

  // Personal calendar (Google Calendar via GIS).
  const events = useGoogleCalendarStore((s) => s.events);
  const gcalStatus = useGoogleCalendarStore((s) => s.status);
  const gcalError = useGoogleCalendarStore((s) => s.error);
  const hasConsented = useGoogleCalendarStore((s) => s.hasConsented);
  const {
    connect: connectGoogle,
    configured: googleConfigured,
    gisReady: googleGisReady,
  } = useTodayEvents();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { lat, lon } = dashboardLatLon();
      const w = await fetchWeatherBrief(lat, lon);
      if (!cancelled) setWeatherLine(asReferenceWeather(w.line));
    };
    load();
    const id = setInterval(load, 600_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  /** Keep fullscreen flag in sync; only Esc (or equivalent) clears it — no exit control in UI. */
  useEffect(() => {
    const sync = (): void => {
      const fs = getFullscreenElement();
      const mine = !!(shellRef.current && fs === shellRef.current);
      setFullscreen(mine);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync as EventListener);
    sync();
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync as EventListener);
    };
  }, []);

  const handleFullscreenClick = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell || fullscreen || immersiveFallback) return;
    const nativeOk = await tryNativeFullscreen(shell);
    if (!nativeOk) {
      setImmersiveFallback(true);
    }
  }, [fullscreen, immersiveFallback]);

  /** Immersive mode: Esc exits (native fullscreen still uses browser Esc). */
  useEffect(() => {
    if (!immersiveFallback) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        setImmersiveFallback(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [immersiveFallback]);

  /** Lock page scroll behind the fixed immersive shell. */
  useEffect(() => {
    if (!immersiveFallback) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [immersiveFallback]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await fetchGuerangerForDay(monthDay(now));
      if (!cancelled) setGueranger(g);
    })();
    return () => {
      cancelled = true;
    };
  }, [now]);

  // Headline comes from the morning Guéranger email (TLM 1962 calendar).
  // When neither the live email entry nor the static gueranger.json has data,
  // we fall back to a TLM 1962-flavored placeholder so the cartouche always
  // has a real saint name in the middle. The placeholder is rendered at
  // reduced opacity with an "(awaiting email)" tag so it's visually clear
  // the data is provisional.
  const placeholder = getPlaceholderFeast(now);
  const liveFeast =
    liturgicalEntry?.feast || liturgicalEntry?.title || gueranger?.title || "";
  const liveSeason = liturgicalEntry?.season || "";
  const feastDisplay = (liveFeast || placeholder.feast).toUpperCase();
  const seasonLine = (liveSeason || placeholder.season || "").toUpperCase();
  const sundayCommemorationsDisplay =
    now.getDay() === 0
      ? (liturgicalEntry?.commemorations ?? [])
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" · ")
          .toUpperCase()
      : "";
  const isPlaceholderFeast = !liveFeast;
  const dateParts = formatHeaderDate(now);
  const weatherParts = splitWeatherLine(weatherLine);

  const hideFullscreenButton = fullscreen || immersiveFallback;

  return (
    <div
      ref={shellRef}
      className={
        `text-[#1a1510] ${dashboardSerif.variable} ${dashboardDisplaySerif.variable} ` +
        // Native fullscreen: some browsers don't stretch the element unless
        // explicit dimensions are set on :fullscreen / :-webkit-full-screen.
        `[&:fullscreen]:!h-screen [&:fullscreen]:!w-screen [&:fullscreen]:!max-h-none [&:fullscreen]:!max-w-none ` +
        `[&:-webkit-full-screen]:!h-screen [&:-webkit-full-screen]:!w-screen [&:-webkit-full-screen]:!max-h-none [&:-webkit-full-screen]:!max-w-none ` +
        (immersiveFallback
          ? "fixed inset-0 z-[9998] flex min-h-0 w-screen max-w-[100vw] flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
          : "relative flex min-h-0 h-screen w-screen flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain")
      }
      style={{
        fontFamily: "var(--font-dashboard-serif), Georgia, 'EB Garamond', serif",
        background: PROVENCE.woodShadow,
      }}
    >
      {/* Painting + patina: full viewport, outside foreground `zoom`, so no letterboxing. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/family-dashboard/background-provence.png')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(245,234,208,0.10) 0%, rgba(245,234,208,0) 60%)," +
            "linear-gradient(180deg, rgba(255,247,225,0.10) 0%, rgba(245,234,208,0.02) 50%, rgba(94,70,40,0.20) 100%)",
        }}
        aria-hidden
      />

      {/* Foreground: +20% zoom; width stays 100% so layout uses the whole screen (clip/scroll on shell if needed). */}
      <div
        className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        style={{ zoom: DASHBOARD_UI_ZOOM }}
      >
      {/* ===== Content ===== Header full width; parchment cards sit smaller and
          left-aligned so open painting reads on the right. */}
      <div className="relative z-20 flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10 w-full">
        {/* Header cartouche — spans the full usable width beside padding. */}
        <header
          className="relative w-full max-w-none rounded-[3px]"
          style={{
            background:
              `linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.18) 100%), ${PROVENCE.toileBlueDeep}`,
            color: PROVENCE.toileCream,
            fontFamily: "var(--font-dashboard-display), Georgia, serif",
            border: `1px solid rgba(245,234,208,0.35)`,
            boxShadow:
              `0 0 0 4px ${PROVENCE.toileCream}, 0 10px 28px rgba(20,14,8,0.45)`,
          }}
        >
          {/* Subtle inner cream highlight ring for hand-painted feel */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] rounded-[2px]"
            style={{ boxShadow: "inset 0 0 0 1px rgba(245,234,208,0.18)" }}
          />

          {/* Three-zone grid: [date] · [feast + season] · [weather].
              Side zones (1fr each) frame the auto-width center so the feast
              title stays visually centered regardless of flank text length. */}
          <div className="relative px-4 py-[0.912rem] sm:px-10 sm:py-[1.098rem]">
            <div
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-[1.323rem] sm:gap-[2.645rem]"
              style={{
                color: PROVENCE.toileCream,
                textShadow: HEADER_TEXT_SHADOW,
              }}
            >
              {/* ---------- Left zone: Date ---------- */}
              <div className="order-2 sm:order-1 text-center sm:text-left sm:justify-self-start min-w-0">
                <div
                  className="text-[0.77rem] sm:text-[0.858rem] tracking-[0.32em] uppercase leading-tight"
                  style={{ fontWeight: 500, opacity: 0.85 }}
                >
                  {dateParts.weekday}
                </div>
                <div
                  className="mt-1 sm:mt-1.5 text-[1.65rem] sm:text-[1.925rem] lg:text-[2.09rem] leading-[1.1]"
                  style={{
                    fontStyle: "italic",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                  }}
                >
                  {dateParts.display}
                </div>
              </div>

              {/* ---------- Center zone: Feast · Season ---------- */}
              <div className="order-1 sm:order-2 flex flex-col items-center text-center min-w-0 px-2">
                {/* Feast name — primary heading. Italic Cormorant 600 with
                    measured letterspacing reads as a hand-set Roman title.
                    `text-balance` keeps long names like
                    "STS. NEREUS, ACHILLEUS, DOMITILLA AND PANCRAS, MARTYRS"
                    from rivering on TV widths. */}
                <h1
                  className="max-w-[min(92vw,52ch)] sm:max-w-[min(92vw,64ch)] lg:max-w-[min(94vw,80ch)] text-[1.155rem] sm:text-[1.32rem] lg:text-[1.54rem] xl:text-[1.705rem] leading-[1.15] text-balance"
                  style={{
                    fontStyle: "italic",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    opacity: isPlaceholderFeast ? 0.78 : 1,
                  }}
                >
                  {feastDisplay}
                </h1>

                {sundayCommemorationsDisplay ? (
                  <div
                    className="mt-1 sm:mt-1.5 max-w-[min(94vw,70ch)] text-[0.858rem] sm:text-[0.968rem] lg:text-[1.056rem] leading-snug tracking-[0.12em] text-balance uppercase"
                    style={{
                      fontStyle: "italic",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      opacity: 0.82,
                    }}
                  >
                    {sundayCommemorationsDisplay}
                  </div>
                ) : null}

                {/* Season subhead OR awaiting-email tag.
                    When neither is needed (live entry with no season) we
                    render nothing — no stranded "LITURGICAL" label. */}
                {seasonLine ? (
                  <div
                    className="mt-1.5 sm:mt-2 text-[0.792rem] sm:text-[0.902rem] tracking-[0.32em] uppercase leading-tight"
                    style={{ fontWeight: 500, opacity: 0.78 }}
                  >
                    {seasonLine}
                  </div>
                ) : isPlaceholderFeast ? (
                  <div
                    className="mt-1.5 sm:mt-2 text-[0.682rem] sm:text-[0.77rem] tracking-[0.32em] uppercase leading-tight"
                    style={{ fontWeight: 500, opacity: 0.6 }}
                  >
                    (awaiting email)
                  </div>
                ) : null}
              </div>

              {/* ---------- Right zone: Weather ---------- */}
              <div className="order-3 text-center sm:text-right sm:justify-self-end min-w-0">
                <div
                  className="text-[1.1rem] sm:text-[1.2375rem] lg:text-[1.375rem] leading-[1.15] whitespace-nowrap"
                  style={{
                    fontStyle: "italic",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  {weatherParts.primary}
                </div>
                {weatherParts.secondary && (
                  <div
                    className="mt-1 sm:mt-1.5 text-[0.858rem] sm:text-[0.935rem] tracking-[0.32em] uppercase leading-tight whitespace-nowrap"
                    style={{ fontWeight: 500, opacity: 0.85 }}
                  >
                    {weatherParts.secondary}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Panels — compact, intrinsic height (no inset scrollbars; page scrolls only if viewport is shorter). */}
        <div className="mt-6 flex w-full shrink-0 flex-col items-start">
          <div className="flex w-full max-w-[min(620px,calc(100vw-2.5rem))] flex-col gap-4 sm:gap-5 lg:max-w-[min(720px,56vw)] lg:flex-row lg:items-start lg:gap-5">
          {/* Liturgical Year panel */}
          <section
            className="flex min-w-0 flex-1 flex-col rounded-sm shadow-lg bg-[#f5ead0] lg:min-w-0"
            style={{
              backgroundImage: PARCHMENT_TEXTURE,
              border: `1px solid ${PROVENCE.toileBlueDeep}55`,
              boxShadow:
                "0 4px 14px rgba(94,70,40,0.25), 0 0 0 4px rgba(245,234,208,0.55)",
            }}
          >
            <PanelNameplate titleClassName="text-[14px] sm:text-[16px] tracking-[0.04em] sm:tracking-[0.06em]">
              <span className="block">Dom Guéranger&apos;s</span>
              <span className="block">Liturgical Year</span>
            </PanelNameplate>
            <div className="relative z-10 px-5 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-5 font-serif text-[15px] sm:text-[16px] leading-[1.65] text-[#1a1510]">
              {/* Faint pastoral silhouette anchored at the bottom of the panel — extra bottom padding keeps COLLECT clear. */}
              <PastoralSilhouette className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-20 opacity-[0.10]" />
              {(() => {
                // Render priority:
                //   1) Featured pull-quote from today's email (preferred body content)
                //   2) Email-fed entry's reflection/collect/readings
                //   3) Static gueranger.json (keyed by MM-DD)
                //   4) Friendly placeholder
                const email = liturgicalEntry;
                const featuredQuote =
                  email?.quote?.trim() ||
                  (gueranger?.reflection ? extractFirstSentence(gueranger.reflection) : "") ||
                  "";
                const attributionFeast =
                  email?.feast || email?.title || gueranger?.title || "";

                if (featuredQuote) {
                  return (
                    <PullQuote
                      quote={featuredQuote}
                      attributionFeast={attributionFeast}
                    />
                  );
                }
                if (
                  email &&
                  (email.reflection || email.collect || email.readings || email.title || email.feast)
                ) {
                  return (
                    <div className="space-y-3">
                      {(email.title || email.feast) && (
                        <p
                          className="font-semibold"
                          style={{ color: PROVENCE.toileBlueDeep }}
                        >
                          {email.title ?? email.feast}
                        </p>
                      )}
                      {email.reflection && (
                        <p className="whitespace-pre-wrap">{email.reflection}</p>
                      )}
                      {email.collect && (
                        <p>
                          <span className="font-semibold">COLLECT:</span>{" "}
                          <span className="whitespace-pre-wrap">{email.collect}</span>
                        </p>
                      )}
                      {email.readings && (
                        <p>
                          <span className="font-semibold">MASS READINGS:</span>{" "}
                          <span className="whitespace-pre-wrap">{email.readings}</span>
                        </p>
                      )}
                    </div>
                  );
                }
                if (gueranger === undefined) {
                  return <p className="text-[#5b4a36]">Loading…</p>;
                }
                if (
                  gueranger &&
                  (gueranger.reflection || gueranger.collect || gueranger.readings || gueranger.title)
                ) {
                  return (
                    <div className="space-y-3">
                      {gueranger.title && (
                        <p
                          className="font-semibold"
                          style={{ color: PROVENCE.toileBlueDeep }}
                        >
                          {gueranger.title}
                        </p>
                      )}
                      {gueranger.reflection && (
                        <p className="whitespace-pre-wrap">{gueranger.reflection}</p>
                      )}
                      {gueranger.collect && (
                        <p>
                          <span className="font-semibold">COLLECT:</span>{" "}
                          <span className="whitespace-pre-wrap">{gueranger.collect}</span>
                        </p>
                      )}
                      {gueranger.readings && (
                        <p>
                          <span className="font-semibold">MASS READINGS:</span>{" "}
                          <span className="whitespace-pre-wrap">{gueranger.readings}</span>
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="space-y-3 break-words">
                    <p className="italic" style={{ color: PROVENCE.toileBlueDeep }}>
                      A quiet day of prayer.
                    </p>
                    <p>
                      We beseech Thee, O Lord, to grant Thy household a quiet day,
                      that we may serve Thee in peace and gladness through Jesus
                      Christ our Lord.
                    </p>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Today's Schedule panel (Google Calendar) */}
          <section
            className="flex w-full shrink-0 flex-col rounded-sm shadow-lg bg-[#f5ead0] lg:w-[min(288px,34vw)]"
            style={{
              backgroundImage: PARCHMENT_TEXTURE,
              border: `1px solid ${PROVENCE.toileBlueDeep}55`,
              boxShadow:
                "0 4px 14px rgba(94,70,40,0.25), 0 0 0 4px rgba(245,234,208,0.55)",
            }}
          >
            <PanelNameplate>Today&apos;s Schedule</PanelNameplate>
            <div className="flex flex-col">
              <ScheduleBody
                events={events}
                status={gcalStatus}
                error={gcalError}
                hasConsented={hasConsented}
                configured={googleConfigured}
                onConnect={connectGoogle}
                gisReady={googleGisReady}
              />
            </div>
          </section>
          </div>
        </div>

        {/* Spacer pushes the colophon to the bottom of the content area. */}
        <div className="flex-1" />

        {/* Colophon — high-contrast chit on the painting so the wordmark stays readable. */}
        <div className="flex items-end justify-between gap-4">
          <span aria-hidden className="flex-1" />
          <div
            className="max-w-[min(96vw,40rem)] text-center rounded-sm px-4 py-2.5 sm:px-6 sm:py-3"
            style={{
              fontFamily: "var(--font-dashboard-display), Georgia, serif",
              background: "rgba(245,234,208,0.92)",
              border: `1px solid rgba(31,58,85,0.22)`,
              boxShadow:
                "0 2px 14px rgba(20,14,8,0.2), inset 0 1px 0 rgba(255,250,238,0.85)",
            }}
          >
            <p
              className="text-[16px] sm:text-[19px] tracking-[0.38em] uppercase leading-tight"
              style={{
                color: PROVENCE.toileBlueDeep,
                fontWeight: 700,
                textShadow:
                  "0 0 1px rgba(255,250,238,1), " +
                  "0 1px 0 rgba(255,250,238,0.9), " +
                  "0 2px 6px rgba(18,14,10,0.25)",
              }}
            >
              The Lynch Family
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <Link
              href="/family-dashboard/feed"
              className="text-[10px] tracking-[0.3em] uppercase hover:opacity-100"
              style={{
                color: PROVENCE.toileBlueDeep,
                opacity: 0.55,
                fontFamily: "var(--font-dashboard-display), Georgia, serif",
              }}
            >
              Feed →
            </Link>
          </div>
        </div>
      </div>
      </div>

      {!hideFullscreenButton && (
        <button
          type="button"
          onClick={handleFullscreenClick}
          aria-label="Enter full screen — press Escape to exit"
          title="Enter full screen. Press Escape to exit."
          className="pointer-events-auto fixed bottom-6 right-6 z-[9999] flex min-h-[44px] min-w-[120px] items-center justify-center rounded-sm border px-4 py-2 text-[11px] tracking-[0.28em] uppercase shadow-lg backdrop-blur-sm transition-opacity hover:opacity-95 sm:bottom-10 sm:right-10"
          style={{
            borderColor: "rgba(245,234,208,0.55)",
            background: `rgba(31,58,85,0.78)`,
            color: PROVENCE.toileCream,
            fontFamily: "var(--font-dashboard-display), Georgia, serif",
            boxShadow: "0 4px 20px rgba(20,14,8,0.35), 0 0 0 1px rgba(245,234,208,0.25)",
          }}
        >
          Full screen
        </button>
      )}
    </div>
  );
}
