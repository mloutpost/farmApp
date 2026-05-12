"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EB_Garamond } from "next/font/google";
import {
  COST_CATEGORY_LABELS,
  type CostCategoryId,
  type Vacation,
  useTravelPlanningStore,
  vacationTotalUsd,
} from "@/store/travel-planning-store";
import { PROVENCE, PARCHMENT_TEXTURE } from "@/lib/family-dashboard/dashboard-tokens";
import {
  GOOGLE_CALENDAR_SCOPE,
  getGoogleClientId,
  prefetchGoogleTokenClient,
  requestGoogleAccessToken,
  type GoogleAccessTokenResult,
} from "@/lib/family-dashboard/google-token";
import {
  addMinutesToRFC3339,
  insertSingleDayAllDayEvent,
  insertTimedCalendarEvent,
  insertVacationAllDayEvent,
  localWallTimeToRFC3339,
} from "@/lib/family-dashboard/google-calendar-insert";

const serif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-travel-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatRange(v: Vacation): string {
  if (v.startDate === v.endDate) return v.startDate;
  return `${v.startDate} → ${v.endDate}`;
}

const FLIGHT_BLOCK_MIN = 90;

function isoDateOk(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatFlightSummary(carrier: string, flightNumber: string): string {
  const c = carrier.trim();
  const n = flightNumber.trim();
  if (!c && !n) return "Flight";
  if (!c) return `Flight ${n}`;
  if (!n) return `${c} flight`;
  return `${c} ${n}`;
}

export default function TravelPlanningPage() {
  const vacations = useTravelPlanningStore((s) => s.vacations);
  const addVacation = useTravelPlanningStore((s) => s.addVacation);
  const updateVacation = useTravelPlanningStore((s) => s.updateVacation);
  const removeVacation = useTravelPlanningStore((s) => s.removeVacation);
  const addCostLine = useTravelPlanningStore((s) => s.addCostLine);
  const updateCostLine = useTravelPlanningStore((s) => s.updateCostLine);
  const removeCostLine = useTravelPlanningStore((s) => s.removeCostLine);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [attendeeDrafts, setAttendeeDrafts] = useState<Record<string, string>>({});
  const [syncBusyId, setSyncBusyId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<Record<string, string>>({});

  const googleConfigured = !!getGoogleClientId();
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (!googleConfigured) {
      setGisReady(false);
      return;
    }
    let cancelled = false;
    void prefetchGoogleTokenClient(GOOGLE_CALENDAR_SCOPE)
      .then(() => {
        if (!cancelled) setGisReady(true);
      })
      .catch(() => {
        if (!cancelled) setGisReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [googleConfigured]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  const handleAddTrip = useCallback(() => {
    if (!newStart || !newEnd) return;
    if (newEnd < newStart) return;
    addVacation({
      title: newTitle.trim() || "Trip",
      startDate: newStart,
      endDate: newEnd,
    });
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
  }, [addVacation, newTitle, newStart, newEnd]);

  const handleSyncCalendar = useCallback(
    (v: Vacation): void => {
      if (!googleConfigured || !gisReady) return;
      if (v.endDate < v.startDate) return;

      const raw = attendeeDrafts[v.id] ?? "";
      const attendeeEmails = raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let tokenPromise: Promise<GoogleAccessTokenResult>;
      try {
        tokenPromise = requestGoogleAccessToken({ silent: false });
      } catch (e) {
        setSyncMessage((m) => ({
          ...m,
          [v.id]: e instanceof Error ? e.message : String(e),
        }));
        return;
      }

      setSyncBusyId(v.id);
      setSyncMessage((m) => ({ ...m, [v.id]: "" }));

      tokenPromise
        .then(async (result) => {
          const fresh = useTravelPlanningStore.getState().vacations.find((x) => x.id === v.id) ?? v;
          const desc =
            `${fresh.journal ? `${fresh.journal}\n\n` : ""}` +
            `Estimated total: ${money.format(vacationTotalUsd(fresh))}\n` +
            (fresh.costLines.length
              ? fresh.costLines
                  .map(
                    (l) =>
                      `- ${COST_CATEGORY_LABELS[l.category]}: ${money.format(l.amount)}${l.note ? ` (${l.note})` : ""}`
                  )
                  .join("\n")
              : "");
          const trip = await insertVacationAllDayEvent(result.accessToken, {
            summary: fresh.title,
            description: desc || undefined,
            startDate: fresh.startDate,
            endDate: fresh.endDate,
            attendeeEmails,
          });

          const flightNotes = [fresh.title && `Trip: ${fresh.title}`, fresh.journal?.trim()]
            .filter(Boolean)
            .join("\n\n");

          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          const syncLeg = async (
            leg: "Depart" | "Return",
            carrier: string,
            flightNumber: string,
            date: string,
            timeLocal: string
          ): Promise<{ id: string; htmlLink?: string } | null> => {
            const c = carrier.trim();
            const n = flightNumber.trim();
            if (!c || !n || !isoDateOk(date)) return null;

            const summary = `${formatFlightSummary(c, n)} · ${leg}`;
            const hasTime = timeLocal.trim().length > 0;
            if (hasTime) {
              const startRfc = localWallTimeToRFC3339(date, timeLocal);
              if (!startRfc) {
                throw new Error(
                  `${leg} flight: pick a valid local time, or clear the time field for an all-day flight.`
                );
              }
              const endRfc = addMinutesToRFC3339(startRfc, FLIGHT_BLOCK_MIN);
              if (!endRfc) {
                throw new Error(`${leg} flight: could not compute end time.`);
              }
              return insertTimedCalendarEvent(result.accessToken, {
                summary,
                description: flightNotes || undefined,
                startDateTime: startRfc,
                endDateTime: endRfc,
                timeZone,
                attendeeEmails,
              });
            }

            return insertSingleDayAllDayEvent(result.accessToken, {
              summary,
              description: flightNotes || undefined,
              date,
              attendeeEmails,
            });
          };

          const departOut = await syncLeg(
            "Depart",
            fresh.departFlightCarrier ?? "",
            fresh.departFlightNumber ?? "",
            fresh.departFlightDate ?? fresh.startDate,
            fresh.departFlightTime ?? ""
          );
          const returnOut = await syncLeg(
            "Return",
            fresh.returnFlightCarrier ?? "",
            fresh.returnFlightNumber ?? "",
            fresh.returnFlightDate ?? fresh.endDate,
            fresh.returnFlightTime ?? ""
          );

          const parts: string[] = [];
          parts.push(trip.htmlLink ? `Trip: ${trip.htmlLink}` : `Trip (id ${trip.id})`);
          if (departOut) {
            parts.push(departOut.htmlLink ? `Depart: ${departOut.htmlLink}` : `Depart (id ${departOut.id})`);
          }
          if (returnOut) {
            parts.push(returnOut.htmlLink ? `Return: ${returnOut.htmlLink}` : `Return (id ${returnOut.id})`);
          }
          setSyncMessage((m) => ({ ...m, [v.id]: parts.join(" · ") }));
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          setSyncMessage((m) => ({ ...m, [v.id]: msg }));
        })
        .finally(() => {
          setSyncBusyId(null);
        });
    },
    [googleConfigured, gisReady, attendeeDrafts]
  );

  const sorted = useMemo(() => [...vacations], [vacations]);

  return (
    <div
      className={`min-h-screen w-full ${serif.variable} text-[#1a1510]`}
      style={{
        fontFamily: "var(--font-travel-serif), Georgia, serif",
        background: PROVENCE.woodShadow,
      }}
    >
      <div
        className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10"
        style={{
          backgroundImage: PARCHMENT_TEXTURE,
          backgroundColor: PROVENCE.toileCream,
          border: `1px solid ${PROVENCE.toileBlueDeep}44`,
          boxShadow: "0 8px 28px rgba(20,14,8,0.25)",
        }}
      >
        <header className="mb-8 border-b pb-6" style={{ borderColor: "rgba(91,58,28,0.2)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: PROVENCE.toileBlueDeep }}>
            Family
          </p>
          <h1 className="mt-2 text-3xl font-semibold italic sm:text-4xl" style={{ color: PROVENCE.toileBlueDeep }}>
            Travel planning journal
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed" style={{ color: "#5b3a1c" }}>
            Plan vacations on a timeline, estimate costs by category, and sync to Google Calendar: one all-day trip
            block plus optional departing and returning flight events (carrier, flight number, date, and optional local
            time).
          </p>
          <Link
            href="/family-dashboard"
            className="mt-4 inline-block text-sm font-semibold uppercase tracking-[0.18em] underline underline-offset-4 hover:opacity-80"
            style={{ color: PROVENCE.toileBlueDeep }}
          >
            ← TV board
          </Link>
        </header>

        <section
          className="mb-10 rounded-sm border p-4 sm:p-5"
          style={{
            borderColor: "rgba(31,58,85,0.25)",
            background: "rgba(255,250,238,0.65)",
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: PROVENCE.toileBlueDeep }}>
            New vacation
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
              <span style={{ color: "#5b3a1c" }}>Title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-sm border px-2 py-1.5 text-base"
                style={{ borderColor: "rgba(31,58,85,0.35)" }}
                placeholder="Summer in Maine"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "#5b3a1c" }}>Start</span>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="rounded-sm border px-2 py-1.5"
                style={{ borderColor: "rgba(31,58,85,0.35)" }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: "#5b3a1c" }}>End</span>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="rounded-sm border px-2 py-1.5"
                style={{ borderColor: "rgba(31,58,85,0.35)" }}
              />
            </label>
            <button
              type="button"
              onClick={handleAddTrip}
              disabled={!newStart || !newEnd || newEnd < newStart}
              className="rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
              style={{
                borderColor: PROVENCE.toileBlueDeep,
                background: PROVENCE.toileBlueDeep,
                color: PROVENCE.toileCream,
              }}
            >
              Add to journal
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-lg font-semibold uppercase tracking-[0.14em]" style={{ color: PROVENCE.toileBlueDeep }}>
            Timeline
          </h2>
          {sorted.length === 0 ? (
            <p className="text-sm italic" style={{ color: "#5b3a1c" }}>
              No trips yet — add one above.
            </p>
          ) : (
            <ol className="relative ms-2 border-l-2 border-dashed sm:ms-4" style={{ borderColor: "rgba(31,58,85,0.35)" }}>
              {sorted.map((v) => {
                const total = vacationTotalUsd(v);
                const open = expanded[v.id] ?? false;
                return (
                  <li key={v.id} className="relative mb-10 pl-8 sm:pl-12">
                    <span
                      className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 sm:-left-[11px] sm:h-5 sm:w-5"
                      style={{
                        borderColor: PROVENCE.toileBlueDeep,
                        background: PROVENCE.toileCream,
                        boxShadow: "0 0 0 3px rgba(245,234,208,0.9)",
                      }}
                      aria-hidden
                    />
                    <div
                      className="rounded-sm border shadow-sm"
                      style={{
                        borderColor: "rgba(31,58,85,0.28)",
                        background: "rgba(255,250,238,0.92)",
                      }}
                    >
                      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4" style={{ borderColor: "rgba(91,58,28,0.15)" }}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#8a6f43" }}>
                            {formatRange(v)}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: PROVENCE.toileBlueDeep }}>
                            {v.title}
                          </h3>
                          <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: "#2a1a08" }}>
                            {money.format(total)}
                            <span className="ml-2 text-xs font-normal uppercase tracking-[0.12em]" style={{ color: "#5b3a1c" }}>
                              estimated
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(v.id)}
                            className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
                            style={{ borderColor: PROVENCE.toileBlueDeep, color: PROVENCE.toileBlueDeep }}
                            aria-expanded={open}
                          >
                            {open ? "Collapse" : "Details"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVacation(v.id)}
                            className="rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] hover:opacity-90"
                            style={{ borderColor: PROVENCE.toileRed, color: PROVENCE.toileRed }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {open ? (
                        <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="flex flex-col gap-1 text-sm">
                              <span style={{ color: "#5b3a1c" }}>Title</span>
                              <input
                                value={v.title}
                                onChange={(e) => updateVacation(v.id, { title: e.target.value })}
                                className="rounded-sm border px-2 py-1.5"
                                style={{ borderColor: "rgba(31,58,85,0.35)" }}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span style={{ color: "#5b3a1c" }}>Start</span>
                              <input
                                type="date"
                                value={v.startDate}
                                onChange={(e) => updateVacation(v.id, { startDate: e.target.value })}
                                className="rounded-sm border px-2 py-1.5"
                                style={{ borderColor: "rgba(31,58,85,0.35)" }}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                              <span style={{ color: "#5b3a1c" }}>End</span>
                              <input
                                type="date"
                                value={v.endDate}
                                onChange={(e) => updateVacation(v.id, { endDate: e.target.value })}
                                className="rounded-sm border px-2 py-1.5"
                                style={{ borderColor: "rgba(31,58,85,0.35)" }}
                              />
                            </label>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: PROVENCE.toileBlueDeep }}>
                              Flights (separate calendar events)
                            </h4>
                            <p className="mt-1 text-xs leading-snug" style={{ color: "#5b3a1c" }}>
                              Enter carrier and flight number for each leg. Sync creates its own event: timed if you set
                              local time, otherwise an all-day event on that date.
                            </p>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                              <div
                                className="rounded-sm border p-3"
                                style={{ borderColor: "rgba(31,58,85,0.2)", background: "rgba(255,255,255,0.4)" }}
                              >
                                <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#8a6f43" }}>
                                  Departing
                                </p>
                                <div className="mt-2 grid gap-2">
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Carrier</span>
                                    <input
                                      value={v.departFlightCarrier ?? ""}
                                      onChange={(e) => updateVacation(v.id, { departFlightCarrier: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                      placeholder="UA, Delta, …"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Flight number</span>
                                    <input
                                      value={v.departFlightNumber ?? ""}
                                      onChange={(e) => updateVacation(v.id, { departFlightNumber: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                      placeholder="1842"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Date</span>
                                    <input
                                      type="date"
                                      value={v.departFlightDate ?? v.startDate}
                                      onChange={(e) => updateVacation(v.id, { departFlightDate: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Local time (optional)</span>
                                    <input
                                      type="time"
                                      value={v.departFlightTime ?? ""}
                                      onChange={(e) => updateVacation(v.id, { departFlightTime: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5 tabular-nums"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                    />
                                  </label>
                                </div>
                              </div>
                              <div
                                className="rounded-sm border p-3"
                                style={{ borderColor: "rgba(31,58,85,0.2)", background: "rgba(255,255,255,0.4)" }}
                              >
                                <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#8a6f43" }}>
                                  Returning
                                </p>
                                <div className="mt-2 grid gap-2">
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Carrier</span>
                                    <input
                                      value={v.returnFlightCarrier ?? ""}
                                      onChange={(e) => updateVacation(v.id, { returnFlightCarrier: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                      placeholder="UA, Delta, …"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Flight number</span>
                                    <input
                                      value={v.returnFlightNumber ?? ""}
                                      onChange={(e) => updateVacation(v.id, { returnFlightNumber: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                      placeholder="1204"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Date</span>
                                    <input
                                      type="date"
                                      value={v.returnFlightDate ?? v.endDate}
                                      onChange={(e) => updateVacation(v.id, { returnFlightDate: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1 text-sm">
                                    <span style={{ color: "#5b3a1c" }}>Local time (optional)</span>
                                    <input
                                      type="time"
                                      value={v.returnFlightTime ?? ""}
                                      onChange={(e) => updateVacation(v.id, { returnFlightTime: e.target.value })}
                                      className="rounded-sm border px-2 py-1.5 tabular-nums"
                                      style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: PROVENCE.toileBlueDeep }}>
                                Costs
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {(Object.keys(COST_CATEGORY_LABELS) as CostCategoryId[]).map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => addCostLine(v.id, cat)}
                                    className="rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:opacity-90"
                                    style={{ borderColor: "rgba(31,58,85,0.35)", color: "#3d2410" }}
                                  >
                                    + {COST_CATEGORY_LABELS[cat]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <ul className="mt-3 space-y-2">
                              {v.costLines.map((line) => (
                                <li
                                  key={line.id}
                                  className="flex flex-col gap-2 rounded-sm border p-2 sm:flex-row sm:items-center sm:gap-3"
                                  style={{ borderColor: "rgba(91,58,28,0.12)" }}
                                >
                                  <select
                                    value={line.category}
                                    onChange={(e) =>
                                      updateCostLine(v.id, line.id, {
                                        category: e.target.value as CostCategoryId,
                                      })
                                    }
                                    className="rounded-sm border px-2 py-1 text-sm sm:w-44"
                                    style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                  >
                                    {(Object.keys(COST_CATEGORY_LABELS) as CostCategoryId[]).map((c) => (
                                      <option key={c} value={c}>
                                        {COST_CATEGORY_LABELS[c]}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={line.note}
                                    onChange={(e) => updateCostLine(v.id, line.id, { note: e.target.value })}
                                    placeholder="Note"
                                    className="min-w-0 flex-1 rounded-sm border px-2 py-1 text-sm"
                                    style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                  />
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={Number.isFinite(line.amount) ? line.amount : 0}
                                    onChange={(e) =>
                                      updateCostLine(v.id, line.id, {
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full rounded-sm border px-2 py-1 text-sm tabular-nums sm:w-28"
                                    style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeCostLine(v.id, line.id)}
                                    className="text-xs font-semibold uppercase tracking-wide hover:opacity-80"
                                    style={{ color: PROVENCE.toileRed }}
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: PROVENCE.toileBlueDeep }}>
                              Journal
                            </span>
                            <textarea
                              value={v.journal}
                              onChange={(e) => updateVacation(v.id, { journal: e.target.value })}
                              rows={6}
                              className="w-full rounded-sm border px-3 py-2 text-base leading-relaxed"
                              style={{ borderColor: "rgba(31,58,85,0.35)" }}
                              placeholder="Itinerary ideas, lodging links, packing list…"
                            />
                          </label>

                          <div
                            className="rounded-sm border p-3"
                            style={{ borderColor: "rgba(31,58,85,0.25)", background: "rgba(255,255,255,0.35)" }}
                          >
                            <h4 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: PROVENCE.toileBlueDeep }}>
                              Sync vacation to Google Calendar
                            </h4>
                            <p className="mt-1 text-xs leading-snug" style={{ color: "#5b3a1c" }}>
                              Creates the trip all-day span (inclusive), then one event per flight leg when carrier,
                              flight number, and date are filled. Add comma-separated attendee emails to send invites.
                            </p>
                            <label className="mt-3 flex flex-col gap-1 text-sm">
                              <span style={{ color: "#5b3a1c" }}>Attendee emails</span>
                              <input
                                value={attendeeDrafts[v.id] ?? ""}
                                onChange={(e) =>
                                  setAttendeeDrafts((m) => ({
                                    ...m,
                                    [v.id]: e.target.value,
                                  }))
                                }
                                className="rounded-sm border px-2 py-1.5 text-sm"
                                style={{ borderColor: "rgba(31,58,85,0.35)" }}
                                placeholder="you@example.com, partner@example.com"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={!googleConfigured || !gisReady || syncBusyId === v.id || v.endDate < v.startDate}
                              onClick={() => handleSyncCalendar(v)}
                              className="mt-3 rounded-sm border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] disabled:opacity-40"
                              style={{
                                borderColor: PROVENCE.toileBlueDeep,
                                background: PROVENCE.toileBlueDeep,
                                color: PROVENCE.toileCream,
                              }}
                            >
                              {syncBusyId === v.id ? "Syncing…" : "Sync to Google Calendar"}
                            </button>
                            {!googleConfigured ? (
                              <p className="mt-2 text-xs" style={{ color: PROVENCE.toileRed }}>
                                Set NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in .env.local and enable the Calendar API.
                              </p>
                            ) : !gisReady ? (
                              <p className="mt-2 text-xs" style={{ color: "#5b3a1c" }}>
                                Preparing Google sign-in… try again in a moment.
                              </p>
                            ) : null}
                            {syncMessage[v.id] ? (
                              <p className="mt-2 break-all text-xs leading-snug" style={{ color: "#2a1a08" }}>
                                {syncMessage[v.id]}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
