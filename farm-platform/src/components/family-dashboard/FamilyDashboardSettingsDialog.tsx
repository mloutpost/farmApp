"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTodayEvents } from "@/hooks/useTodayEvents";
import { PROVENCE } from "@/lib/family-dashboard/dashboard-tokens";
import {
  GOOGLE_CALENDAR_SCOPE,
  fetchGoogleAccountEmail,
  getGoogleClientId,
  requestGoogleAccessToken,
} from "@/lib/family-dashboard/google-token";
import { useGmailSourceStore } from "@/store/gmail-source-store";
import { useGoogleCalendarStore } from "@/store/google-calendar-store";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
      style={{
        background: ok ? "rgba(31,58,85,0.12)" : "rgba(122,24,24,0.1)",
        color: ok ? PROVENCE.toileBlueDeep : PROVENCE.toileRed,
      }}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "#8a6f43" }}>
        {label}
      </p>
      <p className="break-all text-sm leading-snug" style={{ color: "#1a1510" }}>
        {value}
      </p>
      {hint ? (
        <p className="text-[11px] leading-snug" style={{ color: "#5b3a1c" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function FamilyDashboardSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const gmailSource = useGmailSourceStore((s) => s.source);
  const calendarStatus = useGoogleCalendarStore((s) => s.status);
  const calendarEmail = useGoogleCalendarStore((s) => s.emailAddress);
  const hasCalendarConsent = useGoogleCalendarStore((s) => s.hasConsented);
  const setCalendarEmail = useGoogleCalendarStore((s) => s.setEmailAddress);
  const lastFetchedAt = useGoogleCalendarStore((s) => s.lastFetchedAt);
  const { connect, disconnect, configured, gisReady } = useTodayEvents();

  const resolveCalendarEmail = useCallback(async () => {
    if (!configured || !hasCalendarConsent || calendarEmail) return;
    try {
      const result = await requestGoogleAccessToken({ silent: true });
      const email = await fetchGoogleAccountEmail(result.accessToken);
      if (email) setCalendarEmail(email);
    } catch {
      /* silent grant may require user gesture */
    }
  }, [calendarEmail, configured, hasCalendarConsent, setCalendarEmail]);

  useEffect(() => {
    if (!open) return;
    void resolveCalendarEmail();
  }, [open, resolveCalendarEmail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const calendarConnected =
    hasCalendarConsent && (calendarStatus === "connected" || calendarStatus === "idle");
  const oauthConfigured = !!getGoogleClientId();

  return createPortal(
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-end p-3 sm:p-5"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fd-settings-title"
        className="max-h-[min(92vh,40rem)] w-full max-w-sm overflow-y-auto rounded-l-md border shadow-2xl"
        style={{
          fontFamily: "Georgia, serif",
          borderColor: `${PROVENCE.toileBlueDeep}55`,
          background: PROVENCE.toileCream,
          boxShadow: "0 12px 40px rgba(20,14,8,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="sticky top-0 flex items-start justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "rgba(31,58,85,0.2)", background: "rgba(253,248,238,0.98)" }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "#8a6f43" }}>
              Family dashboard
            </p>
            <h2 id="fd-settings-title" className="mt-1 text-lg font-semibold" style={{ color: PROVENCE.toileBlueDeep }}>
              Connected accounts
            </h2>
            <p className="mt-1 text-xs leading-snug" style={{ color: "#5b3a1c" }}>
              Liturgical mail and Google Calendar can use different Google accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="shrink-0 rounded-sm border px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] hover:opacity-80"
            style={{ borderColor: "rgba(31,58,85,0.35)", color: PROVENCE.toileBlueDeep }}
          >
            Close
          </button>
        </header>

        <div className="space-y-4 px-4 py-4">
          <section
            className="space-y-3 rounded-sm border p-3"
            style={{ borderColor: "rgba(31,58,85,0.22)", background: "rgba(255,255,255,0.45)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: PROVENCE.toileBlueDeep }}>
                Liturgical Year email
              </h3>
              <StatusPill ok={!!gmailSource} label={gmailSource ? "Configured" : "Not set up"} />
            </div>
            {gmailSource ? (
              <>
                <InfoRow
                  label="Gmail inbox (authorized account)"
                  value={<strong>{gmailSource.emailAddress}</strong>}
                  hint="The Google account whose inbox is searched for the daily email."
                />
                <InfoRow
                  label="Newsletter sender (from address)"
                  value={
                    <>
                      <code className="rounded bg-[#ebe3cf] px-1 text-[12px]">{gmailSource.fromQuery}</code>
                      {gmailSource.fromName ? (
                        <span className="ml-1 text-[#5b3a1c]">— {gmailSource.fromName}</span>
                      ) : null}
                    </>
                  }
                  hint="Only messages from this sender are imported as today's saint / liturgy."
                />
                {gmailSource.labelName ? (
                  <InfoRow label="Gmail label filter" value={gmailSource.labelName} />
                ) : null}
              </>
            ) : (
              <p className="text-sm leading-snug" style={{ color: "#5b3a1c" }}>
                No inbox configured yet. Run the Gmail wizard to pick which account receives the Dom Guéranger
                newsletter and which sender address to watch.
              </p>
            )}
            <Link
              href="/family-dashboard/connect-gmail"
              onClick={onClose}
              className="inline-block rounded-sm border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] hover:opacity-90"
              style={{
                borderColor: PROVENCE.toileBlueDeep,
                background: PROVENCE.toileBlueDeep,
                color: PROVENCE.toileCream,
              }}
            >
              {gmailSource ? "Change liturgy inbox" : "Set up liturgy inbox"}
            </Link>
          </section>

          <section
            className="space-y-3 rounded-sm border p-3"
            style={{ borderColor: "rgba(31,58,85,0.22)", background: "rgba(255,255,255,0.45)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: PROVENCE.toileBlueDeep }}>
                Google Calendar
              </h3>
              <StatusPill
                ok={calendarConnected}
                label={
                  calendarStatus === "connecting"
                    ? "Connecting…"
                    : calendarConnected
                      ? "Connected"
                      : "Not connected"
                }
              />
            </div>
            {!oauthConfigured ? (
              <p className="text-sm leading-snug" style={{ color: PROVENCE.toileRed }}>
                Set <code className="text-xs">NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID</code> in{" "}
                <code className="text-xs">.env.local</code> to enable Calendar.
              </p>
            ) : calendarStatus === "error" ? (
              <p className="text-sm leading-snug" style={{ color: PROVENCE.toileRed }}>
                Calendar connection failed — pick an account again below.
              </p>
            ) : calendarConnected ? (
              <>
                <InfoRow
                  label="Google account (calendar)"
                  value={
                    calendarEmail ? (
                      <strong>{calendarEmail}</strong>
                    ) : (
                      <span className="italic">Connected — account email loading…</span>
                    )
                  }
                  hint="Today's Schedule and travel sync use this account's primary calendar."
                />
                {lastFetchedAt ? (
                  <p className="text-[11px]" style={{ color: "#8a6f43" }}>
                    Last fetched {new Date(lastFetchedAt).toLocaleString()}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm leading-snug" style={{ color: "#5b3a1c" }}>
                Connect a Google account to show today's events on the TV board and sync travel plans.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!configured || !gisReady || calendarStatus === "connecting"}
                onClick={() => connect()}
                className="rounded-sm border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
                style={{
                  borderColor: PROVENCE.toileBlueDeep,
                  background: PROVENCE.toileBlueDeep,
                  color: PROVENCE.toileCream,
                }}
              >
                {calendarConnected ? "Switch calendar account" : "Connect calendar"}
              </button>
              {calendarConnected ? (
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="rounded-sm border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] hover:opacity-90"
                  style={{ borderColor: PROVENCE.toileRed, color: PROVENCE.toileRed }}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            {!gisReady && configured ? (
              <p className="text-[11px]" style={{ color: "#5b3a1c" }}>
                Preparing Google sign-in…
              </p>
            ) : null}
          </section>

          <p className="text-[10px] leading-snug" style={{ color: "#8a6f43" }}>
            Calendar scope: <span className="font-mono text-[9px]">{GOOGLE_CALENDAR_SCOPE}</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
