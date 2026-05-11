"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EB_Garamond, Cormorant_Garamond } from "next/font/google";
import { useAuth } from "@/hooks/useAuth";
import {
  GmailApiError,
  LITURGICAL_SEARCH_QUERIES,
  buildSenderSearchQuery,
  extractPlainTextBody,
  getHeader,
  getMessage,
  getProfile,
  listLabels,
  searchMessages,
  summarizeSenders,
  type GmailLabel,
  type GmailMessage,
  type GmailProfile,
  type SenderCandidate,
} from "@/lib/family-dashboard/gmail";
import {
  GMAIL_ACCOUNT_CHOOSER_PROMPT,
  GOOGLE_GMAIL_READONLY_SCOPE,
  getGoogleClientId,
  prefetchGoogleTokenClient,
  requestGoogleGmailAccessToken,
  type GoogleAccessTokenResult,
} from "@/lib/family-dashboard/google-token";
import {
  parseLiturgicalEmail,
  sundayCommemorationHeadlines,
  type ParsedLiturgicalEmail,
} from "@/lib/family-dashboard/email-parser";
import { useLiturgicalYearSync } from "@/hooks/useLiturgicalYearSync";
import { useGmailSourceStore } from "@/store/gmail-source-store";
import { useGmailSourceSync } from "@/hooks/useGmailSourceSync";

/* ---------- Fonts (mirror the dashboard) ---------- */

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

/* ---------- Palette (mirror FamilyDashboardView) ---------- */

const PROVENCE = {
  toileCream: "#f5ead0",
  toileBlue: "#3b5b7a",
  toileBlueDeep: "#1f3a55",
  toileRed: "#9b4a3e",
  woodMid: "#8a6f43",
  woodDeep: "#5a4322",
  sage: "#8a9a6e",
  oliveDeep: "#5a6a3f",
} as const;

const INK = "#2a1a08";
const INK_SOFT = "#5b3a1c";

const PARCHMENT_TEXTURE =
  "radial-gradient(circle at 12% 18%, rgba(120, 78, 30, 0.05), transparent 38%)," +
  "radial-gradient(circle at 82% 72%, rgba(59, 91, 122, 0.05), transparent 42%)," +
  "radial-gradient(circle at 50% 92%, rgba(138, 154, 110, 0.04), transparent 48%)," +
  "repeating-linear-gradient(45deg, rgba(122, 92, 50, 0.020) 0 2px, transparent 2px 6px)," +
  "repeating-linear-gradient(-45deg, rgba(122, 92, 50, 0.016) 0 2px, transparent 2px 6px)";

const DISPLAY_FAMILY = "var(--font-dashboard-display), Georgia, serif";
const BODY_FAMILY = "var(--font-dashboard-serif), Georgia, 'EB Garamond', serif";

/* ---------- Step model ---------- */

type StepId =
  | "welcome"
  | "connect"
  | "confirm"
  | "sender"
  | "label"
  | "preview"
  | "done";

interface StepDef {
  id: StepId;
  numeral: string;
  label: string;
}

const STEPS: ReadonlyArray<StepDef> = [
  { id: "welcome", numeral: "I", label: "Begin" },
  { id: "connect", numeral: "II", label: "Connect Google" },
  { id: "confirm", numeral: "III", label: "Confirm inbox" },
  { id: "sender", numeral: "IV", label: "Choose sender" },
  { id: "label", numeral: "V", label: "Label (optional)" },
  { id: "preview", numeral: "VI", label: "Preview today" },
  { id: "done", numeral: "VII", label: "Complete" },
];

function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

/* ---------- Local helpers ---------- */

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatGmailDate(internalDate?: string, fallback?: string): string {
  if (internalDate) {
    const ms = parseInt(internalDate, 10);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  return fallback ?? "";
}

/* ---------- Inscribed step indicator ---------- */

function StepRail({ activeId }: { activeId: StepId }) {
  const activeIdx = stepIndex(activeId);
  return (
    <nav aria-label="Wizard steps" className="w-full">
      <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-5">
        {STEPS.map((s, i) => {
          const reached = i <= activeIdx;
          const isActive = i === activeIdx;
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3">
              <span
                aria-current={isActive ? "step" : undefined}
                className="flex items-center gap-1.5"
                style={{
                  color: reached ? PROVENCE.toileBlueDeep : `${INK_SOFT}99`,
                  fontFamily: DISPLAY_FAMILY,
                  fontStyle: "italic",
                }}
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] sm:text-xs"
                  style={{
                    border: `1.5px solid ${reached ? PROVENCE.toileBlueDeep : `${INK_SOFT}66`}`,
                    background: isActive ? PROVENCE.toileBlueDeep : "transparent",
                    color: isActive ? PROVENCE.toileCream : reached ? PROVENCE.toileBlueDeep : `${INK_SOFT}99`,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.numeral}
                </span>
                <span
                  className="hidden sm:inline text-xs tracking-[0.15em] uppercase"
                  style={{ fontStyle: "normal", fontWeight: 500 }}
                >
                  {s.label}
                </span>
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="h-px w-3 sm:w-6"
                  style={{ background: `${INK_SOFT}55` }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- Inscribed UI primitives ---------- */

function InkRule({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 8"
      preserveAspectRatio="none"
      className={`h-2 w-full ${className}`}
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
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

function InscribedButton({ variant = "primary", className = "", ...rest }: ButtonProps) {
  const baseClasses =
    "min-h-[48px] rounded-sm px-5 py-2.5 text-sm sm:text-base tracking-[0.16em] uppercase transition-opacity disabled:opacity-40 disabled:cursor-not-allowed";
  const styleByVariant: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
    primary: {
      background: PROVENCE.toileBlueDeep,
      color: PROVENCE.toileCream,
      border: `1px solid ${PROVENCE.toileBlueDeep}`,
      fontFamily: DISPLAY_FAMILY,
      fontWeight: 600,
      boxShadow: "0 1px 0 rgba(255,247,225,0.5) inset, 0 2px 6px rgba(94,70,40,0.25)",
    },
    secondary: {
      background: "rgba(255, 250, 238, 0.9)",
      color: PROVENCE.toileBlueDeep,
      border: `1.5px solid ${PROVENCE.toileBlueDeep}`,
      fontFamily: DISPLAY_FAMILY,
      fontWeight: 600,
    },
    ghost: {
      background: "transparent",
      color: INK_SOFT,
      border: `1px dashed ${INK_SOFT}77`,
      fontFamily: DISPLAY_FAMILY,
      fontStyle: "italic",
      fontWeight: 500,
    },
  };
  return (
    <button
      type="button"
      {...rest}
      className={`${baseClasses} hover:opacity-85 ${className}`}
      style={{ ...styleByVariant[variant], ...(rest.style ?? {}) }}
    />
  );
}

function PanelHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="text-center mb-5">
      <h2
        className="tracking-[0.18em] text-xl sm:text-2xl"
        style={{
          color: PROVENCE.toileBlueDeep,
          fontFamily: DISPLAY_FAMILY,
          fontStyle: "italic",
          fontWeight: 600,
          textShadow: "0 1px 0 rgba(255,247,225,0.7)",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-1 text-sm sm:text-base tracking-[0.05em]"
          style={{ color: INK_SOFT, fontFamily: BODY_FAMILY, fontStyle: "italic" }}
        >
          {subtitle}
        </p>
      )}
      <div className="mx-auto mt-3 max-w-xs">
        <InkRule />
      </div>
    </header>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-xs tracking-[0.22em] uppercase mb-1"
      style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

const FIELD_BASE_CLASSES =
  "w-full rounded-sm px-3 py-2 text-[15px] outline-none focus:ring-2";
const FIELD_BASE_STYLE: React.CSSProperties = {
  background: "rgba(255,250,238,0.95)",
  border: `1px solid ${PROVENCE.toileBlueDeep}55`,
  color: INK,
  fontFamily: BODY_FAMILY,
};

type HelperTone = "info" | "warn" | "error" | "success";

function HelperText({ children, tone = "info" }: { children: React.ReactNode; tone?: HelperTone }) {
  const colorByTone: Record<HelperTone, string> = {
    info: INK_SOFT,
    warn: PROVENCE.woodDeep,
    error: PROVENCE.toileRed,
    success: PROVENCE.oliveDeep,
  };
  return (
    <p
      className="text-sm leading-snug"
      style={{ color: colorByTone[tone], fontFamily: BODY_FAMILY, fontStyle: "italic" }}
    >
      {children}
    </p>
  );
}

/* ---------- Step bodies ---------- */

function WelcomeStep({
  signedIn,
  loadingAuth,
  configured,
  existingEmail,
  onBegin,
}: {
  signedIn: boolean;
  loadingAuth: boolean;
  configured: boolean;
  existingEmail: string | null;
  onBegin: () => void;
}) {
  return (
    <div className="space-y-5">
      <PanelHeading
        title="Connect a Gmail Inbox"
        subtitle="for Dom Guéranger's daily Liturgical Year email"
      />
      <p className="text-[15px] sm:text-base leading-relaxed" style={{ color: INK, fontFamily: BODY_FAMILY }}>
        This wizard walks through choosing the right Google account and Gmail
        sender so the dashboard can automatically pick up each morning&apos;s
        Liturgical Year email. The connection is saved per family-dashboard
        user and used by both the in-browser preview and the local CLI
        importer.
      </p>
      <ul
        className="space-y-2 pl-5 list-disc text-[15px] leading-relaxed"
        style={{ color: INK, fontFamily: BODY_FAMILY }}
      >
        <li>You&apos;ll be asked to grant <em>read-only</em> access to Gmail.</li>
        <li>You can switch accounts at any step — the chooser is always shown.</li>
        <li>The wizard ends by importing today&apos;s email so you can verify it.</li>
      </ul>

      {!configured && (
        <div
          className="rounded-sm border-2 px-4 py-3"
          style={{ borderColor: PROVENCE.toileRed, background: "rgba(255,250,238,0.9)" }}
        >
          <HelperText tone="error">
            <strong>NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID</strong> isn&apos;t set in
            <code className="mx-1 rounded bg-[#e5d8b5] px-1 text-[12px]">.env.local</code>.
            Add an OAuth client and restart <code className="mx-1 rounded bg-[#e5d8b5] px-1 text-[12px]">npm run dev</code>{" "}
            before continuing. See <code className="rounded bg-[#e5d8b5] px-1 text-[12px]">docs/family-dashboard-setup.md</code>.
          </HelperText>
        </div>
      )}

      {existingEmail && (
        <div
          className="rounded-sm border px-4 py-3"
          style={{ borderColor: `${PROVENCE.toileBlueDeep}66`, background: "rgba(255,250,238,0.9)" }}
        >
          <HelperText tone="success">
            <strong>Previously connected:</strong>{" "}
            <span style={{ fontStyle: "italic" }}>{existingEmail}</span>.
            Google grants expire periodically — clicking <em>Begin</em> below
            re-opens Google&apos;s sign-in popup so you can refresh the
            connection (pick the same account to keep the saved sender and
            label, or pick a different one to start fresh).
          </HelperText>
        </div>
      )}

      {!loadingAuth && !signedIn && (
        <div
          className="rounded-sm border-2 px-4 py-3"
          style={{ borderColor: PROVENCE.woodMid, background: "rgba(255,250,238,0.9)" }}
        >
          <HelperText tone="warn">
            <strong>Optional:</strong> sign in to the family dashboard before
            running the wizard so the Gmail connection is shared with your TV
            and CLI importer (otherwise it&apos;s remembered only on this
            device). <Link href="/" className="underline">Sign in</Link>, then
            return here.
          </HelperText>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <InscribedButton onClick={onBegin} disabled={!configured}>
          {existingEmail ? "Refresh connection →" : "Begin →"}
        </InscribedButton>
        <Link
          href="/family-dashboard/feed"
          className="text-sm tracking-[0.18em] uppercase underline-offset-2 hover:underline"
          style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
        >
          ← Return to feed
        </Link>
      </div>
    </div>
  );
}

function ConnectStep({
  busy,
  onConnect,
  errorMessage,
  gisReady,
}: {
  busy: boolean;
  onConnect: () => void;
  errorMessage: string | null;
  gisReady: boolean;
}) {
  // GIS load can take ~200-1500ms on first visit. Until it's primed,
  // the popup MUST be deferred — opening it before the token client
  // exists would either fail synchronously or break the user-gesture
  // chain. Surface that wait clearly so the user doesn't click into
  // the void thinking the wizard is broken.
  const label = !gisReady
    ? "Preparing Google sign-in…"
    : busy
      ? "Opening Google…"
      : "Connect Google →";
  const waiting = !gisReady || busy;
  return (
    <div className="space-y-5">
      <PanelHeading
        title="Connect Google"
        subtitle="The chooser will always appear so you can pick the right account."
      />
      <p className="text-[15px] leading-relaxed" style={{ color: INK, fontFamily: BODY_FAMILY }}>
        Clicking <em>Connect</em> opens Google&apos;s account chooser. Pick the
        Google account that <strong>receives the Dom Guéranger email</strong> —
        this can be different from the account you signed into the dashboard
        with. Grant the requested <em>gmail.readonly</em> permission.
      </p>
      <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT, fontFamily: BODY_FAMILY, fontStyle: "italic" }}>
        Nothing is sent to any server but Google. The token stays in your
        browser and the page only reads — never modifies — your inbox.
      </p>
      {errorMessage && (
        <HelperText tone="error">{errorMessage}</HelperText>
      )}
      <div className="pt-3 flex items-center gap-3">
        <InscribedButton onClick={onConnect} disabled={busy || !gisReady}>
          {waiting && (
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full mr-2 align-middle animate-pulse"
              style={{ background: INK_SOFT, opacity: 0.7 }}
            />
          )}
          {label}
        </InscribedButton>
        {!gisReady && (
          <span
            className="text-[12px] italic"
            style={{ color: INK_SOFT, fontFamily: BODY_FAMILY }}
          >
            One moment — loading Google&apos;s sign-in script.
          </span>
        )}
      </div>
    </div>
  );
}

function ConfirmStep({
  profile,
  onAccept,
  onSwitchAccount,
  busy,
}: {
  profile: GmailProfile | null;
  onAccept: () => void;
  onSwitchAccount: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-5">
      <PanelHeading title="Confirm the inbox" subtitle="Is this the account that receives the email?" />
      {profile ? (
        <div
          className="rounded-sm border px-5 py-4"
          style={{ borderColor: `${PROVENCE.toileBlueDeep}66`, background: "rgba(255,250,238,0.92)" }}
        >
          <FieldLabel>You are connected as</FieldLabel>
          <p
            className="text-xl sm:text-2xl"
            style={{ color: PROVENCE.toileBlueDeep, fontFamily: DISPLAY_FAMILY, fontStyle: "italic", fontWeight: 600 }}
          >
            {profile.emailAddress}
          </p>
          {typeof profile.messagesTotal === "number" && (
            <p className="mt-2 text-sm" style={{ color: INK_SOFT, fontFamily: BODY_FAMILY }}>
              {profile.messagesTotal.toLocaleString()} total messages in this inbox.
            </p>
          )}
        </div>
      ) : (
        <HelperText>Loading profile…</HelperText>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <InscribedButton onClick={onAccept} disabled={!profile || busy}>
          Yes, continue →
        </InscribedButton>
        <InscribedButton variant="secondary" onClick={onSwitchAccount} disabled={busy}>
          Pick a different account
        </InscribedButton>
      </div>
    </div>
  );
}

interface SenderStepProps {
  candidates: SenderCandidate[];
  loading: boolean;
  loadError: string | null;
  selected: SenderCandidate | null;
  manualQuery: string;
  setManualQuery: (q: string) => void;
  onPick: (c: SenderCandidate | null) => void;
  onUseManual: () => void;
  onRefresh: () => void;
  onContinue: () => void;
}

function SenderStep({
  candidates,
  loading,
  loadError,
  selected,
  manualQuery,
  setManualQuery,
  onPick,
  onUseManual,
  onRefresh,
  onContinue,
}: SenderStepProps) {
  return (
    <div className="space-y-5">
      <PanelHeading
        title="Find the Liturgical Year sender"
        subtitle="We searched recent messages — pick the right sender, or enter your own search."
      />

      {loading && <HelperText>Searching your inbox…</HelperText>}
      {loadError && <HelperText tone="error">{loadError}</HelperText>}

      {!loading && candidates.length === 0 && !loadError && (
        <div
          className="rounded-sm border px-4 py-4"
          style={{ borderColor: `${INK_SOFT}55`, background: "rgba(255,250,238,0.9)" }}
        >
          <HelperText tone="warn">
            No automatic matches in the last 60 days for &ldquo;Guéranger&rdquo; or
            &ldquo;Liturgical Year&rdquo;. Enter the sender&apos;s address (or any
            Gmail search clause like <code>from:hello@example.com</code>) below.
          </HelperText>
        </div>
      )}

      {candidates.length > 0 && (
        <ul className="space-y-3">
          {candidates.slice(0, 6).map((c) => {
            const isSelected = selected?.email === c.email;
            return (
              <li key={c.email}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="w-full text-left rounded-sm px-4 py-3 sm:px-5 sm:py-4 transition-opacity hover:opacity-90"
                  style={{
                    border: `1.5px solid ${isSelected ? PROVENCE.toileBlueDeep : `${INK_SOFT}55`}`,
                    background: isSelected ? "rgba(31,58,85,0.08)" : "rgba(255,250,238,0.92)",
                  }}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="text-base sm:text-lg"
                      style={{ color: PROVENCE.toileBlueDeep, fontFamily: DISPLAY_FAMILY, fontStyle: "italic", fontWeight: 600 }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="text-xs tracking-[0.15em] uppercase"
                      style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY }}
                    >
                      {c.count} message{c.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: INK, fontFamily: BODY_FAMILY }}>
                    {c.email}
                  </p>
                  {c.subjects.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[13px] leading-snug" style={{ color: INK_SOFT, fontFamily: BODY_FAMILY }}>
                      {c.subjects.map((s, i) => (
                        <li key={`${c.email}-subj-${i}`} className="truncate">
                          • {s || <em>(no subject)</em>}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className="rounded-sm border px-4 py-4"
        style={{ borderColor: `${INK_SOFT}55`, background: "rgba(255,250,238,0.9)" }}
      >
        <FieldLabel>Or enter a search query yourself</FieldLabel>
        <p className="text-[13px] mb-2" style={{ color: INK_SOFT, fontFamily: BODY_FAMILY, fontStyle: "italic" }}>
          Anything Gmail accepts. Examples:{" "}
          <code className="rounded bg-[#e5d8b5] px-1 text-[12px]">noreply@example.com</code>,{" "}
          <code className="rounded bg-[#e5d8b5] px-1 text-[12px]">from:(dom OR gueranger)</code>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            placeholder="from:noreply@example.com"
            className={FIELD_BASE_CLASSES}
            style={FIELD_BASE_STYLE}
          />
          <InscribedButton variant="secondary" onClick={onUseManual} disabled={!manualQuery.trim()}>
            Use this query
          </InscribedButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <InscribedButton onClick={onContinue} disabled={!selected && !manualQuery.trim()}>
          Continue →
        </InscribedButton>
        <InscribedButton variant="ghost" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Re-search inbox"}
        </InscribedButton>
      </div>
    </div>
  );
}

interface LabelStepProps {
  labels: GmailLabel[];
  loading: boolean;
  loadError: string | null;
  selected: GmailLabel | null;
  onPick: (label: GmailLabel | null) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function LabelStep({
  labels,
  loading,
  loadError,
  selected,
  onPick,
  onContinue,
  onSkip,
}: LabelStepProps) {
  // Show user labels first; surface labels whose name mentions liturgy/guéranger.
  const userLabels = labels.filter((l) => l.type === "user");
  const suggested = userLabels.filter((l) =>
    /lit(urg)?|gueranger|guéranger|year/i.test(l.name)
  );
  const others = userLabels.filter((l) => !suggested.includes(l));
  const grouped = [
    { heading: "Suggested", items: suggested },
    { heading: "Your labels", items: others },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <PanelHeading
        title="Filter by a label (optional)"
        subtitle="If you've sorted these emails into a label, picking it makes searches faster."
      />
      {loading && <HelperText>Loading labels…</HelperText>}
      {loadError && <HelperText tone="error">{loadError}</HelperText>}

      {!loading && userLabels.length === 0 && !loadError && (
        <HelperText>This inbox has no user-defined labels. You can skip this step.</HelperText>
      )}

      {grouped.map((group) => (
        <section key={group.heading} className="space-y-2">
          <FieldLabel>{group.heading}</FieldLabel>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((l) => {
              const isSelected = selected?.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onPick(isSelected ? null : l)}
                    className="rounded-sm px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
                    style={{
                      border: `1.5px solid ${isSelected ? PROVENCE.toileBlueDeep : `${INK_SOFT}55`}`,
                      background: isSelected ? "rgba(31,58,85,0.08)" : "rgba(255,250,238,0.92)",
                      color: isSelected ? PROVENCE.toileBlueDeep : INK,
                      fontFamily: BODY_FAMILY,
                    }}
                    aria-pressed={isSelected}
                  >
                    {l.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <InscribedButton onClick={onContinue}>
          {selected ? "Use this label →" : "Continue without label →"}
        </InscribedButton>
        <InscribedButton variant="ghost" onClick={onSkip}>
          Skip
        </InscribedButton>
      </div>
    </div>
  );
}

/* ---------- Preview step: per-section editor ---------- */

type SectionId =
  | "feast"
  | "title"
  | "season"
  | "reflection"
  | "collect"
  | "readings"
  | "quote";

interface SectionDef {
  id: SectionId;
  label: string;
  multiline: boolean;
  rows: number;
}

// Order is important: this drives the visual order of the per-section editor.
// The parser only extracts feast/title/reflection/collect/readings; season is
// dashboard-header text and quote is the LLM pull-quote, both filled in by
// hand here (or later by the CLI import script).
const SECTION_DEFS: ReadonlyArray<SectionDef> = [
  { id: "feast",      label: "Feast",         multiline: false, rows: 1 },
  { id: "title",      label: "Title",         multiline: false, rows: 1 },
  { id: "season",     label: "Season",        multiline: false, rows: 1 },
  { id: "reflection", label: "Reflection",    multiline: true,  rows: 6 },
  { id: "collect",    label: "Collect",       multiline: true,  rows: 4 },
  { id: "readings",   label: "Mass Readings", multiline: true,  rows: 4 },
  { id: "quote",      label: "Quote",         multiline: true,  rows: 3 },
];

type SectionMap<T> = Record<SectionId, T>;

export type SectionSelection = Partial<SectionMap<string>>;

function parsedValueFor(parsed: ParsedLiturgicalEmail | null, id: SectionId): string {
  if (!parsed) return "";
  switch (id) {
    case "feast":      return parsed.feast ?? "";
    case "title":      return parsed.title ?? "";
    case "reflection": return parsed.reflection ?? "";
    case "collect":    return parsed.collect ?? "";
    case "readings":   return parsed.readings ?? "";
    case "season":     return parsed.season ?? "";
    // The LLM pull-quote isn't generated in the browser, so the field
    // is empty until the CLI runs.
    case "quote":      return "";
  }
}

function defaultIncludedFor(id: SectionId, parsedText: string): boolean {
  // Quote is always unchecked by default — the LLM pull-quote isn't generated
  // in the browser, so the field is empty until the CLI runs.
  if (id === "quote") return false;
  return parsedText.trim().length > 0;
}

interface SectionRowProps {
  def: SectionDef;
  value: string;
  included: boolean;
  parsedSnapshot: string;
  onValueChange: (next: string) => void;
  onIncludedChange: (next: boolean) => void;
  onRevert: () => void;
}

function SectionRow({
  def,
  value,
  included,
  parsedSnapshot,
  onValueChange,
  onIncludedChange,
  onRevert,
}: SectionRowProps) {
  const checkboxId = `liturgy-section-${def.id}`;
  const diverged = value !== parsedSnapshot;
  const canRevert = diverged && parsedSnapshot.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          id={checkboxId}
          type="checkbox"
          checked={included}
          onChange={(e) => onIncludedChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[#1f3a55]"
          style={{ accentColor: PROVENCE.toileBlueDeep }}
          aria-label={`Include ${def.label} in saved entry`}
        />
        <label
          htmlFor={checkboxId}
          className="text-xs tracking-[0.22em] uppercase cursor-pointer"
          style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontWeight: 600 }}
        >
          {def.label}
        </label>
        {canRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="ml-auto text-[11px] tracking-[0.16em] uppercase underline-offset-2 hover:underline"
            style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
            title="Restore the value the parser produced"
          >
            ↺ revert to parsed
          </button>
        )}
      </div>
      {def.multiline ? (
        <textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          rows={def.rows}
          className={`${FIELD_BASE_CLASSES} leading-relaxed resize-y`}
          style={FIELD_BASE_STYLE}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={FIELD_BASE_CLASSES}
          style={FIELD_BASE_STYLE}
        />
      )}
    </div>
  );
}

export type PreviewSavePayload = {
  selection: SectionSelection;
  /** Stripped saint headlines following the principal Sunday Mass entry, or empty. */
  commemorations: string[];
};

interface PreviewStepProps {
  loading: boolean;
  loadError: string | null;
  message: GmailMessage | null;
  body: string;
  parsed: ParsedLiturgicalEmail | null;
  saving: boolean;
  saveMessage: string | null;
  onRefresh: () => void;
  onSave: (payload: PreviewSavePayload) => void;
  onContinue: () => void;
  signedIn: boolean;
}

function PreviewStep({
  loading,
  loadError,
  message,
  body,
  parsed,
  saving,
  saveMessage,
  onRefresh,
  onSave,
  onContinue,
  signedIn,
}: PreviewStepProps) {
  const subject = message ? getHeader(message, "Subject") : undefined;
  const fromHeader = message ? getHeader(message, "From") : undefined;
  const dateHeader = message ? getHeader(message, "Date") : undefined;
  const formattedDate = formatGmailDate(message?.internalDate, dateHeader);

  // ── Multi-entry handling ───────────────────────────────────────────
  // Most days the Liturgical Year email carries a single entry, but
  // major feasts and Sundays pile on commemorated saints (3 entries
  // is common). We let the user pick which one feeds the dashboard.
  const entries = parsed?.entries ?? [];
  const [entryIndex, setEntryIndex] = useState(0);
  // Reset to the first entry whenever a fresh parse arrives.
  const [entryIndexSeededFor, setEntryIndexSeededFor] =
    useState<ParsedLiturgicalEmail | null>(parsed);
  if (parsed !== entryIndexSeededFor) {
    setEntryIndexSeededFor(parsed);
    setEntryIndex(0);
  }
  const safeEntryIndex = Math.min(entryIndex, Math.max(0, entries.length - 1));

  // Build a "view" of `parsed` that pretends the selected entry IS the
  // primary one — this lets the existing per-section editor stay
  // entry-agnostic. Season is shared across all entries so it stays
  // on the wrapper.
  const parsedForEntry = useMemo<ParsedLiturgicalEmail | null>(() => {
    if (!parsed) return null;
    if (entries.length === 0) return parsed;
    const e = entries[safeEntryIndex];
    return {
      season: parsed.season,
      entries,
      title: e.title,
      feast: e.feast,
      reflection: e.reflection,
      reflectionLatin: e.reflectionLatin,
      collect: e.collect,
      collectLatin: e.collectLatin,
      readings: e.readings,
      readingsLatin: e.readingsLatin,
    };
  }, [parsed, entries, safeEntryIndex]);

  // Per-section editor state. The parsed result becomes the initial snapshot
  // (used for the revert button) and the source of the default include flags.
  // We re-seed every time `parsedForEntry` changes — i.e. after a Re-fetch
  // latest OR after the user picks a different entry — using React's
  // documented "reset state during render" pattern rather than an effect.
  const buildSeed = useCallback((p: ParsedLiturgicalEmail | null) => {
    const nextValues = {} as SectionMap<string>;
    const nextIncluded = {} as SectionMap<boolean>;
    const nextSnapshot = {} as SectionMap<string>;
    for (const def of SECTION_DEFS) {
      const v = parsedValueFor(p, def.id);
      nextValues[def.id] = v;
      nextIncluded[def.id] = defaultIncludedFor(def.id, v);
      nextSnapshot[def.id] = v;
    }
    return { nextValues, nextIncluded, nextSnapshot };
  }, []);

  const initial = useMemo(() => buildSeed(parsedForEntry), [buildSeed, parsedForEntry]);

  const [values, setValues] = useState<SectionMap<string>>(initial.nextValues);
  const [included, setIncluded] = useState<SectionMap<boolean>>(initial.nextIncluded);
  const [snapshot, setSnapshot] = useState<SectionMap<string>>(initial.nextSnapshot);
  const [seededFor, setSeededFor] = useState<ParsedLiturgicalEmail | null>(parsedForEntry);

  if (parsedForEntry !== seededFor) {
    setSeededFor(parsedForEntry);
    setValues(initial.nextValues);
    setIncluded(initial.nextIncluded);
    setSnapshot(initial.nextSnapshot);
  }

  const handleValueChange = useCallback((id: SectionId, next: string) => {
    setValues((prev) => {
      const wasEmpty = !prev[id].trim();
      const becomesNonEmpty = next.trim().length > 0;
      // Auto-flip include on when the user types into a previously-empty
      // field — handy when the parser missed a section.
      if (wasEmpty && becomesNonEmpty) {
        setIncluded((s) => (s[id] ? s : { ...s, [id]: true }));
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const handleIncludedChange = useCallback((id: SectionId, next: boolean) => {
    setIncluded((prev) => ({ ...prev, [id]: next }));
  }, []);

  const handleRevert = useCallback((id: SectionId) => {
    setValues((prev) => ({ ...prev, [id]: snapshot[id] }));
  }, [snapshot]);

  const checkedAndFilled = useMemo(
    () => SECTION_DEFS.filter((def) => included[def.id] && values[def.id].trim().length > 0),
    [included, values]
  );
  const totalSections = SECTION_DEFS.length;
  const willSaveCount = checkedAndFilled.length;
  const canSave = !!message && !saving && willSaveCount > 0;

  const handleSaveClick = useCallback(() => {
    if (!parsed) return;
    const sel: SectionSelection = {};
    for (const def of checkedAndFilled) {
      sel[def.id] = values[def.id].trim();
    }
    const commemorations = sundayCommemorationHeadlines(parsed, safeEntryIndex);
    onSave({ selection: sel, commemorations });
  }, [parsed, checkedAndFilled, values, safeEntryIndex, onSave]);

  return (
    <div className="space-y-5">
      <PanelHeading
        title="Preview today's email"
        subtitle="Most recent matching message — pick which sections to save."
      />

      {loading && <HelperText>Fetching the most recent matching message…</HelperText>}
      {loadError && <HelperText tone="error">{loadError}</HelperText>}

      {!loading && !message && !loadError && (
        <HelperText tone="warn">
          No matching message found. Re-check the sender on the previous step,
          or wait until the next email arrives.
        </HelperText>
      )}

      {message && (
        <div className="space-y-3">
          <div
            className="rounded-sm border px-4 py-3"
            style={{ borderColor: `${PROVENCE.toileBlueDeep}66`, background: "rgba(255,250,238,0.92)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[5rem_1fr] gap-y-1 gap-x-3 text-[14px]" style={{ fontFamily: BODY_FAMILY, color: INK }}>
              <span className="uppercase tracking-[0.18em] text-xs" style={{ color: INK_SOFT }}>From</span>
              <span>{fromHeader ?? "—"}</span>
              <span className="uppercase tracking-[0.18em] text-xs" style={{ color: INK_SOFT }}>Subject</span>
              <span style={{ fontWeight: 500 }}>{subject ?? "—"}</span>
              <span className="uppercase tracking-[0.18em] text-xs" style={{ color: INK_SOFT }}>Date</span>
              <span>{formattedDate || "—"}</span>
            </div>
          </div>

          {entries.length > 1 && (
            <div
              className="rounded-sm border px-4 py-3 space-y-2"
              style={{ borderColor: `${PROVENCE.toileBlueDeep}66`, background: "rgba(255,250,238,0.92)" }}
            >
              <div
                className="text-xs tracking-[0.22em] uppercase"
                style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontWeight: 600 }}
              >
                Today&apos;s email has {entries.length} entries — pick one
              </div>
              <div
                className="text-[12px] italic mb-1"
                style={{ color: INK_SOFT, fontFamily: BODY_FAMILY }}
              >
                Sundays and major feasts often include commemorated saints.
                Choose which entry should drive the dashboard today.
              </div>
              <div className="space-y-1.5">
                {entries.map((e, i) => {
                  const inputId = `liturgy-entry-${i}`;
                  const checked = i === safeEntryIndex;
                  return (
                    <label
                      key={inputId}
                      htmlFor={inputId}
                      className="flex items-start gap-2 cursor-pointer rounded-sm px-2 py-1 hover:bg-[rgba(31,58,85,0.05)]"
                      style={{ color: INK, fontFamily: BODY_FAMILY }}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name="liturgy-entry"
                        checked={checked}
                        onChange={() => setEntryIndex(i)}
                        className="mt-1 h-4 w-4 cursor-pointer"
                        style={{ accentColor: PROVENCE.toileBlueDeep }}
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          className="block text-[14px] leading-snug"
                          style={{ fontWeight: checked ? 600 : 400 }}
                        >
                          {e.title}
                        </span>
                        <span
                          className="block text-[11px] mt-0.5 tracking-[0.16em] uppercase"
                          style={{ color: INK_SOFT, fontStyle: "italic" }}
                        >
                          {e.hasMass ? "Mass + reflection" : "Reflection only"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section
              className="rounded-sm border flex flex-col"
              style={{ borderColor: `${INK_SOFT}55`, background: "rgba(255,250,238,0.9)" }}
            >
              <h3
                className="px-4 py-2 border-b text-xs tracking-[0.22em] uppercase"
                style={{ borderColor: `${INK_SOFT}33`, color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontWeight: 600 }}
              >
                Raw email body
              </h3>
              <pre
                className="px-4 py-3 text-[12.5px] leading-relaxed overflow-auto whitespace-pre-wrap break-words max-h-[560px]"
                style={{ color: INK, fontFamily: '"SF Mono", ui-monospace, monospace' }}
              >
                {body || "(empty body)"}
              </pre>
            </section>

            <section
              className="rounded-sm border flex flex-col"
              style={{ borderColor: `${INK_SOFT}55`, background: "rgba(255,250,238,0.9)" }}
            >
              <h3
                className="px-4 py-2 border-b text-xs tracking-[0.22em] uppercase flex items-center justify-between gap-3"
                style={{ borderColor: `${INK_SOFT}33`, color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontWeight: 600 }}
              >
                <span>Sections to save</span>
                <span
                  className="normal-case tracking-[0.04em] text-[12px]"
                  style={{ color: INK, fontFamily: BODY_FAMILY, fontStyle: "italic", fontWeight: 500 }}
                >
                  {willSaveCount} of {totalSections} sections will be saved
                </span>
              </h3>
              <div className="px-4 py-4 space-y-4" style={{ color: INK, fontFamily: BODY_FAMILY }}>
                {parsed ? (
                  SECTION_DEFS.map((def) => (
                    <SectionRow
                      key={def.id}
                      def={def}
                      value={values[def.id]}
                      included={included[def.id]}
                      parsedSnapshot={snapshot[def.id]}
                      onValueChange={(v) => handleValueChange(def.id, v)}
                      onIncludedChange={(b) => handleIncludedChange(def.id, b)}
                      onRevert={() => handleRevert(def.id)}
                    />
                  ))
                ) : (
                  <HelperText>Parsing…</HelperText>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {!signedIn && (
        <HelperText tone="warn">
          Sign in to the dashboard to save this entry to Firestore. Without
          sign-in we can only stash it in this browser.
        </HelperText>
      )}
      {saveMessage && <HelperText tone="success">{saveMessage}</HelperText>}

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <InscribedButton onClick={handleSaveClick} disabled={!canSave}>
          {saving ? "Saving…" : "Save to today's dashboard entry"}
        </InscribedButton>
        <InscribedButton variant="secondary" onClick={onRefresh} disabled={loading}>
          Re-fetch latest
        </InscribedButton>
        <InscribedButton variant="ghost" onClick={onContinue}>
          {saveMessage ? "Continue →" : "Skip save and continue →"}
        </InscribedButton>
      </div>
      {message && willSaveCount === 0 && (
        <HelperText>Pick at least one section to include.</HelperText>
      )}
    </div>
  );
}

function DoneStep({
  emailAddress,
  fromQuery,
  labelName,
  onRestart,
}: {
  emailAddress: string | null;
  fromQuery: string | null;
  labelName: string | null;
  onRestart: () => void;
}) {
  const fromArg = fromQuery
    ? fromQuery.replace(/'/g, "\\'")
    : "Dom Guéranger <noreply@example.com>";
  const labelArg = labelName ? ` --gmail-label "${labelName}"` : "";
  const cli = `npm run import:liturgy -- --use-saved-source --gmail-from "${fromArg}"${labelArg} --since 7d`;

  return (
    <div className="space-y-5">
      <PanelHeading
        title="Setup complete"
        subtitle="The TV dashboard now reads from this inbox."
      />
      <div
        className="rounded-sm border px-5 py-4"
        style={{ borderColor: `${PROVENCE.toileBlueDeep}66`, background: "rgba(255,250,238,0.92)" }}
      >
        <FieldLabel>Connected source</FieldLabel>
        <p className="text-[15px]" style={{ color: INK, fontFamily: BODY_FAMILY }}>
          <strong>Inbox:</strong> {emailAddress ?? "(unknown)"}
        </p>
        <p className="text-[15px]" style={{ color: INK, fontFamily: BODY_FAMILY }}>
          <strong>Sender query:</strong>{" "}
          <code className="rounded bg-[#ebe3cf] px-1 text-[13px]">{fromQuery ?? "—"}</code>
        </p>
        {labelName && (
          <p className="text-[15px]" style={{ color: INK, fontFamily: BODY_FAMILY }}>
            <strong>Label:</strong>{" "}
            <code className="rounded bg-[#ebe3cf] px-1 text-[13px]">{labelName}</code>
          </p>
        )}
      </div>

      <section className="space-y-2">
        <FieldLabel>To backfill from the command line</FieldLabel>
        <p className="text-[14px]" style={{ color: INK_SOFT, fontFamily: BODY_FAMILY, fontStyle: "italic" }}>
          The browser can&apos;t run the OpenAI quote step (the API key never
          reaches it). Run this locally to import a window of past messages
          with quotes generated:
        </p>
        <pre
          className="overflow-x-auto rounded bg-[#1a1510] text-[#f5e6c8] p-3 text-[12.5px] leading-relaxed"
          style={{ fontFamily: '"SF Mono", ui-monospace, monospace' }}
        >{cli}</pre>
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <Link
          href="/family-dashboard"
          className="min-h-[48px] inline-flex items-center rounded-sm px-5 py-2.5 text-sm tracking-[0.16em] uppercase hover:opacity-85"
          style={{
            background: PROVENCE.toileBlueDeep,
            color: PROVENCE.toileCream,
            border: `1px solid ${PROVENCE.toileBlueDeep}`,
            fontFamily: DISPLAY_FAMILY,
            fontWeight: 600,
            boxShadow: "0 1px 0 rgba(255,247,225,0.5) inset, 0 2px 6px rgba(94,70,40,0.25)",
          }}
        >
          Back to dashboard →
        </Link>
        <Link
          href="/family-dashboard/feed"
          className="text-sm tracking-[0.18em] uppercase underline-offset-2 hover:underline"
          style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
        >
          Open the feed
        </Link>
        <InscribedButton variant="ghost" onClick={onRestart}>
          Re-run wizard
        </InscribedButton>
      </div>
    </div>
  );
}

/* ---------- Wizard root ---------- */

export default function ConnectGmailPage() {
  const { user, loading: loadingAuth } = useAuth();
  const signedIn = !!user;
  const configured = !!getGoogleClientId();

  const savedSource = useGmailSourceStore((s) => s.source);
  const setHasConsented = useGmailSourceStore((s) => s.setHasConsented);
  const setTokenExpiresAt = useGmailSourceStore((s) => s.setTokenExpiresAt);
  const { saveSource, signedIn: gmailSyncSignedIn } = useGmailSourceSync();
  const { saveEntry } = useLiturgicalYearSync();

  // Token kept in a ref so it never lands in localStorage / React state
  // dumps. Rebuilt on demand via requestGoogleGmailAccessToken().
  const tokenRef = useRef<string | null>(null);
  const tokenExpiresAtRef = useRef<number>(0);

  const [stepId, setStepId] = useState<StepId>("welcome");

  // Connect step state
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // True once GIS is loaded and the Gmail token client is primed — i.e.
  // `requestGoogleGmailAccessToken` can fire its popup synchronously
  // from a click handler without the browser blocking it.
  const [gisReady, setGisReady] = useState(false);

  // Pre-load GIS + the Gmail token client on mount, so the user-gesture
  // click path doesn't have to await `loadGisScript()` before opening
  // the popup. Same fix as the Calendar flow in useTodayEvents.
  useEffect(() => {
    if (!configured) {
      setGisReady(false);
      return;
    }
    let cancelled = false;
    void prefetchGoogleTokenClient(GOOGLE_GMAIL_READONLY_SCOPE)
      .then(() => {
        if (!cancelled) setGisReady(true);
      })
      .catch(() => {
        // Surfaced when the user clicks Connect — the slow path retries
        // the load and surfaces a friendly popup-blocked error.
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  // Profile (confirm step)
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  // Sender step state
  const [candidates, setCandidates] = useState<SenderCandidate[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [sendersError, setSendersError] = useState<string | null>(null);
  const [selectedSender, setSelectedSender] = useState<SenderCandidate | null>(null);
  const [manualQuery, setManualQuery] = useState<string>("");
  const [committedFromQuery, setCommittedFromQuery] = useState<string | null>(null);
  const [committedFromName, setCommittedFromName] = useState<string | null>(null);

  // Label step state
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<GmailLabel | null>(null);

  // Preview step state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<GmailMessage | null>(null);
  const [previewBody, setPreviewBody] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedLiturgicalEmail | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  /** Get a fresh access token for any Gmail call. Re-prompts the chooser
   *  when forced, otherwise refreshes silently if the cached token is
   *  still valid. */
  const ensureToken = useCallback(
    async (forceChooser: boolean): Promise<string> => {
      const now = Date.now();
      if (
        !forceChooser &&
        tokenRef.current &&
        tokenExpiresAtRef.current - 60_000 > now
      ) {
        return tokenRef.current;
      }
      const result = await requestGoogleGmailAccessToken({
        prompt: forceChooser ? GMAIL_ACCOUNT_CHOOSER_PROMPT : "",
      });
      tokenRef.current = result.accessToken;
      tokenExpiresAtRef.current = result.expiresAt;
      setTokenExpiresAt(result.expiresAt);
      setHasConsented(true);
      return result.accessToken;
    },
    [setTokenExpiresAt, setHasConsented]
  );

  /**
   * Kick off the Gmail OAuth flow. CRITICAL: must be invoked from a user
   * gesture and stay synchronous up to `requestGoogleGmailAccessToken` —
   * any await before that call lets Brave / Safari treat the popup as
   * not user-initiated and block it. The mount-time prefetch above
   * primes GIS so the call hits the synchronous fast path.
   */
  const handleConnect = useCallback((): void => {
    setConnecting(true);
    setConnectError(null);
    let tokenPromise: Promise<GoogleAccessTokenResult>;
    try {
      tokenPromise = requestGoogleGmailAccessToken({
        prompt: GMAIL_ACCOUNT_CHOOSER_PROMPT,
      });
    } catch (e) {
      setConnecting(false);
      setConnectError(e instanceof Error ? e.message : String(e));
      return;
    }
    tokenPromise
      .then(async (result) => {
        tokenRef.current = result.accessToken;
        tokenExpiresAtRef.current = result.expiresAt;
        setTokenExpiresAt(result.expiresAt);
        setHasConsented(true);
        setProfileBusy(true);
        const p = await getProfile(result.accessToken);
        setProfile(p);
        setStepId("confirm");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        // Rapid double-click: the second click preempted this one in
        // google-token.ts and the newer pending request now owns the
        // UI state. Don't flash a spurious error in between.
        if (/superseded|cancelled/i.test(msg)) return;
        // Also log the original error to the devtools console so the
        // user (or a debugger) can see GIS' precise failure code,
        // which is otherwise paraphrased into the friendly UI string.
        // eslint-disable-next-line no-console
        console.error("[connect-gmail] Google sign-in failed:", e);
        setConnectError(msg);
      })
      .finally(() => {
        setConnecting(false);
        setProfileBusy(false);
      });
  }, [setHasConsented, setTokenExpiresAt]);

  const handleSwitchAccount = useCallback((): void => {
    tokenRef.current = null;
    tokenExpiresAtRef.current = 0;
    setProfile(null);
    setSelectedSender(null);
    setCommittedFromQuery(null);
    setCommittedFromName(null);
    setSelectedLabel(null);
    setStepId("connect");
    handleConnect();
  }, [handleConnect]);

  /** Run the canned Liturgical-Year search queries until one returns hits,
   *  then summarize senders for the user. */
  const loadSenderCandidates = useCallback(async () => {
    setSendersLoading(true);
    setSendersError(null);
    try {
      const token = await ensureToken(false);
      let allRefs: { id: string; threadId: string }[] = [];
      for (const q of LITURGICAL_SEARCH_QUERIES) {
        const result = await searchMessages(token, q, 25);
        if (result.messages.length > 0) {
          allRefs = result.messages;
          break;
        }
      }
      if (allRefs.length === 0) {
        setCandidates([]);
        return;
      }
      const metas: GmailMessage[] = [];
      for (const ref of allRefs.slice(0, 25)) {
        try {
          const m = await getMessage(token, ref.id, "metadata");
          metas.push(m);
        } catch {
          /* skip individual failures */
        }
      }
      setCandidates(summarizeSenders(metas));
    } catch (e) {
      const msg =
        e instanceof GmailApiError
          ? `${e.message}${e.status === 403 ? " — make sure the Gmail scope is added to your OAuth consent screen." : ""}`
          : e instanceof Error
            ? e.message
            : String(e);
      setSendersError(msg);
    } finally {
      setSendersLoading(false);
    }
  }, [ensureToken]);

  const loadLabels = useCallback(async () => {
    setLabelsLoading(true);
    setLabelsError(null);
    try {
      const token = await ensureToken(false);
      const items = await listLabels(token);
      setLabels(items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLabelsError(msg);
    } finally {
      setLabelsLoading(false);
    }
  }, [ensureToken]);

  /** Fetch the most recent message matching the chosen sender (+ optional
   *  label), pull out the plain-text body, and run the parser. */
  const loadTodayPreview = useCallback(async () => {
    if (!committedFromQuery) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setSaveMessage(null);
    try {
      const token = await ensureToken(false);
      const q = buildSenderSearchQuery({
        fromQuery: committedFromQuery,
        labelName: selectedLabel?.name,
        newerThan: "30d",
      });
      const found = await searchMessages(token, q, 5);
      if (found.messages.length === 0) {
        setPreviewMessage(null);
        setPreviewBody("");
        setParsed(null);
        return;
      }
      const msg = await getMessage(token, found.messages[0].id, "full");
      setPreviewMessage(msg);
      const body = extractPlainTextBody(msg);
      setPreviewBody(body);
      setParsed(parseLiturgicalEmail(body));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPreviewError(msg);
    } finally {
      setPreviewLoading(false);
    }
  }, [committedFromQuery, selectedLabel?.name, ensureToken]);

  const handleSavePreview = useCallback(
    async ({ selection, commemorations }: PreviewSavePayload) => {
      if (!previewMessage) return;
      setSavingEntry(true);
      setSaveMessage(null);
      try {
        const date = todayIsoLocal();
        // saveLiturgicalEntryToFirestore omits any falsy field, so leaving
        // unchecked sections undefined here also leaves them out of the
        // Firestore payload (and out of the local store entry).
        await saveEntry({
          date,
          title: selection.title,
          feast: selection.feast,
          season: selection.season,
          reflection: selection.reflection,
          collect: selection.collect,
          readings: selection.readings,
          quote: selection.quote,
          raw: previewBody,
          source: "email",
          commemorations,
        });
        setSaveMessage(
          gmailSyncSignedIn
            ? "Saved. The TV dashboard will refresh momentarily. Run the CLI later for the LLM pull-quote."
            : "Saved locally on this device. Sign in to share with the TV dashboard."
        );
      } finally {
        setSavingEntry(false);
      }
    },
    [previewMessage, previewBody, saveEntry, gmailSyncSignedIn]
  );

  /** Persist the chosen source config, then advance. Called as soon as the
   *  user has both an inbox and a sender — keeps the saved state useful
   *  even if they bail out before the preview step. */
  const persistSource = useCallback(async () => {
    if (!profile?.emailAddress || !committedFromQuery) return;
    await saveSource({
      emailAddress: profile.emailAddress,
      fromQuery: committedFromQuery,
      fromName: committedFromName ?? undefined,
      labelId: selectedLabel?.id,
      labelName: selectedLabel?.name,
    });
  }, [
    profile?.emailAddress,
    committedFromQuery,
    committedFromName,
    selectedLabel?.id,
    selectedLabel?.name,
    saveSource,
  ]);

  /* ---------- Auto-load triggers when stepping forward ---------- */

  useEffect(() => {
    if (stepId === "sender" && candidates.length === 0 && !sendersLoading && !sendersError) {
      void loadSenderCandidates();
    }
  }, [stepId, candidates.length, sendersLoading, sendersError, loadSenderCandidates]);

  useEffect(() => {
    if (stepId === "label" && labels.length === 0 && !labelsLoading && !labelsError) {
      void loadLabels();
    }
  }, [stepId, labels.length, labelsLoading, labelsError, loadLabels]);

  useEffect(() => {
    if (stepId === "preview" && !previewMessage && !previewLoading && !previewError) {
      void loadTodayPreview();
    }
  }, [stepId, previewMessage, previewLoading, previewError, loadTodayPreview]);

  /* ---------- Step navigation ---------- */

  const canGoBack = useMemo(() => {
    return stepId !== "welcome" && stepId !== "done";
  }, [stepId]);

  const goBack = useCallback(() => {
    const i = stepIndex(stepId);
    if (i <= 0) return;
    setStepId(STEPS[i - 1].id);
  }, [stepId]);

  const handleSenderContinue = useCallback(() => {
    let chosenQuery: string | null = null;
    let chosenName: string | null = null;
    if (selectedSender) {
      // Prefer the bare email address as the from clause — Gmail wraps it.
      chosenQuery = selectedSender.email;
      chosenName = selectedSender.name;
    } else if (manualQuery.trim()) {
      chosenQuery = manualQuery.trim();
    }
    if (!chosenQuery) return;
    setCommittedFromQuery(chosenQuery);
    setCommittedFromName(chosenName);
    setStepId("label");
  }, [selectedSender, manualQuery]);

  const handleLabelContinue = useCallback(async () => {
    await persistSource();
    setStepId("preview");
  }, [persistSource]);

  const handlePreviewContinue = useCallback(async () => {
    await persistSource();
    setStepId("done");
  }, [persistSource]);

  const restart = useCallback(() => {
    tokenRef.current = null;
    tokenExpiresAtRef.current = 0;
    setProfile(null);
    setCandidates([]);
    setSelectedSender(null);
    setManualQuery("");
    setCommittedFromQuery(null);
    setCommittedFromName(null);
    setLabels([]);
    setSelectedLabel(null);
    setPreviewMessage(null);
    setPreviewBody("");
    setParsed(null);
    setSaveMessage(null);
    setStepId("welcome");
  }, []);

  /* ---------- Render ---------- */

  return (
    // The (main) layout wraps non-special pages in `<main … overflow-hidden>`,
    // which clips any min-h-screen child. Use h-full with our own scroll
    // container so the wizard scrolls inside the layout's main slot — without
    // weakening the layout for the TV dashboard or the map/ops HUDs.
    <div
      className={`h-full w-full overflow-y-auto text-[#1a1510] ${dashboardSerif.variable} ${dashboardDisplaySerif.variable}`}
      style={{
        fontFamily: BODY_FAMILY,
        background: "#e8d9b0",
        backgroundImage: PARCHMENT_TEXTURE,
      }}
    >
      <header
        className="px-6 py-4 border-b-2"
        style={{
          background: PROVENCE.toileBlueDeep,
          borderColor: "#0f2842",
          color: PROVENCE.toileCream,
        }}
      >
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div>
            <p
              className="text-[10px] tracking-[0.32em] uppercase"
              style={{ color: "#c9a227", fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
            >
              Family dashboard
            </p>
            <h1
              className="text-2xl sm:text-3xl"
              style={{ fontFamily: DISPLAY_FAMILY, fontStyle: "italic", fontWeight: 600 }}
            >
              Liturgical Year — Connect Gmail
            </h1>
          </div>
          <Link
            href="/family-dashboard/feed"
            className="text-sm tracking-[0.16em] uppercase underline-offset-2 hover:underline whitespace-nowrap"
            style={{ color: PROVENCE.toileCream, fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
          >
            ← Back to feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <StepRail activeId={stepId} />
        </div>

        <section
          className="rounded-sm shadow-lg overflow-hidden"
          style={{
            background: PROVENCE.toileCream,
            backgroundImage: PARCHMENT_TEXTURE,
            border: `1px solid ${PROVENCE.toileBlueDeep}55`,
            boxShadow: "0 4px 14px rgba(94,70,40,0.25), 0 0 0 4px rgba(245,234,208,0.55)",
          }}
        >
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {stepId === "welcome" && (
              <WelcomeStep
                signedIn={signedIn}
                loadingAuth={loadingAuth}
                configured={configured}
                existingEmail={savedSource?.emailAddress ?? null}
                onBegin={() => setStepId("connect")}
              />
            )}

            {stepId === "connect" && (
              <ConnectStep
                busy={connecting || profileBusy}
                onConnect={handleConnect}
                errorMessage={connectError}
                gisReady={gisReady}
              />
            )}

            {stepId === "confirm" && (
              <ConfirmStep
                profile={profile}
                onAccept={() => setStepId("sender")}
                onSwitchAccount={handleSwitchAccount}
                busy={connecting || profileBusy}
              />
            )}

            {stepId === "sender" && (
              <SenderStep
                candidates={candidates}
                loading={sendersLoading}
                loadError={sendersError}
                selected={selectedSender}
                manualQuery={manualQuery}
                setManualQuery={setManualQuery}
                onPick={(c) => {
                  setSelectedSender(c);
                  if (c) setManualQuery("");
                }}
                onUseManual={() => {
                  setSelectedSender(null);
                  if (manualQuery.trim()) handleSenderContinue();
                }}
                onRefresh={loadSenderCandidates}
                onContinue={handleSenderContinue}
              />
            )}

            {stepId === "label" && (
              <LabelStep
                labels={labels}
                loading={labelsLoading}
                loadError={labelsError}
                selected={selectedLabel}
                onPick={setSelectedLabel}
                onContinue={() => void handleLabelContinue()}
                onSkip={() => {
                  setSelectedLabel(null);
                  void handleLabelContinue();
                }}
              />
            )}

            {stepId === "preview" && (
              <PreviewStep
                loading={previewLoading}
                loadError={previewError}
                message={previewMessage}
                body={previewBody}
                parsed={parsed}
                saving={savingEntry}
                saveMessage={saveMessage}
                onRefresh={loadTodayPreview}
                onSave={handleSavePreview}
                onContinue={() => void handlePreviewContinue()}
                signedIn={gmailSyncSignedIn}
              />
            )}

            {stepId === "done" && (
              <DoneStep
                emailAddress={profile?.emailAddress ?? savedSource?.emailAddress ?? null}
                fromQuery={committedFromQuery ?? savedSource?.fromQuery ?? null}
                labelName={selectedLabel?.name ?? savedSource?.labelName ?? null}
                onRestart={restart}
              />
            )}
          </div>

          {canGoBack && (
            <footer
              className="px-5 py-3 sm:px-8 border-t flex items-center justify-between"
              style={{ borderColor: `${INK_SOFT}33`, background: "rgba(245,234,208,0.6)" }}
            >
              <button
                type="button"
                onClick={goBack}
                className="text-sm tracking-[0.18em] uppercase underline-offset-2 hover:underline"
                style={{ color: INK_SOFT, fontFamily: DISPLAY_FAMILY, fontStyle: "italic" }}
              >
                ← Back
              </button>
              <span
                className="text-xs tracking-[0.18em] uppercase"
                style={{ color: `${INK_SOFT}99`, fontFamily: DISPLAY_FAMILY }}
              >
                Step {stepIndex(stepId) + 1} of {STEPS.length}
              </span>
            </footer>
          )}
        </section>

        <p
          className="mt-6 text-center text-[11px] tracking-[0.4em] uppercase"
          style={{
            color: INK,
            fontFamily: DISPLAY_FAMILY,
            fontStyle: "italic",
            opacity: 0.7,
          }}
        >
          Faith · Land · Sea
        </p>
      </main>
    </div>
  );
}
