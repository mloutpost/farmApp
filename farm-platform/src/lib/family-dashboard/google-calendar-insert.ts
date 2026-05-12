/**
 * Create Calendar events (e.g. vacation blocks) using an OAuth access token
 * obtained with `GOOGLE_CALENDAR_SCOPE` (includes `calendar.events`).
 */

export interface InsertVacationAllDayEventInput {
  /** Event title shown in Google Calendar */
  summary: string;
  description?: string;
  /** Inclusive first day, YYYY-MM-DD */
  startDate: string;
  /** Inclusive last day, YYYY-MM-DD */
  endDate: string;
  attendeeEmails: string[];
  /** Default `primary` */
  calendarId?: string;
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Inserts an all-day event spanning `startDate` through `endDate` (inclusive).
 * Google Calendar uses an exclusive `end.date`; we set it to the day after `endDate`.
 */
export async function insertVacationAllDayEvent(
  accessToken: string,
  input: InsertVacationAllDayEventInput
): Promise<{ id: string; htmlLink?: string }> {
  const endExclusive = addDaysIso(input.endDate, 1);
  return insertRawCalendarEvent(accessToken, {
    calendarId: input.calendarId,
    attendeeEmails: input.attendeeEmails,
    body: {
      summary: input.summary,
      start: { date: input.startDate },
      end: { date: endExclusive },
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    },
  });
}

export interface InsertSingleDayAllDayEventInput {
  summary: string;
  description?: string;
  /** YYYY-MM-DD */
  date: string;
  attendeeEmails: string[];
  calendarId?: string;
}

/** One all-day “chip” on `date` (not a span). */
export async function insertSingleDayAllDayEvent(
  accessToken: string,
  input: InsertSingleDayAllDayEventInput
): Promise<{ id: string; htmlLink?: string }> {
  const endExclusive = addDaysIso(input.date, 1);
  return insertRawCalendarEvent(accessToken, {
    calendarId: input.calendarId,
    attendeeEmails: input.attendeeEmails,
    body: {
      summary: input.summary,
      start: { date: input.date },
      end: { date: endExclusive },
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    },
  });
}

export interface InsertTimedCalendarEventInput {
  summary: string;
  description?: string;
  /** RFC3339 with offset, e.g. 2026-07-15T14:30:00-04:00 */
  startDateTime: string;
  endDateTime: string;
  /** IANA zone, e.g. America/New_York */
  timeZone: string;
  attendeeEmails: string[];
  calendarId?: string;
}

export async function insertTimedCalendarEvent(
  accessToken: string,
  input: InsertTimedCalendarEventInput
): Promise<{ id: string; htmlLink?: string }> {
  return insertRawCalendarEvent(accessToken, {
    calendarId: input.calendarId,
    attendeeEmails: input.attendeeEmails,
    body: {
      summary: input.summary,
      start: { dateTime: input.startDateTime, timeZone: input.timeZone },
      end: { dateTime: input.endDateTime, timeZone: input.timeZone },
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    },
  });
}

async function insertRawCalendarEvent(
  accessToken: string,
  opts: {
    calendarId?: string;
    attendeeEmails: string[];
    body: Record<string, unknown>;
  }
): Promise<{ id: string; htmlLink?: string }> {
  const cal = encodeURIComponent(opts.calendarId ?? "primary");
  const attendees = opts.attendeeEmails
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .map((email) => ({ email }));

  const body: Record<string, unknown> = { ...opts.body };
  if (attendees.length > 0) body.attendees = attendees;

  const sendUpdates = attendees.length > 0 ? "all" : "none";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events?sendUpdates=${sendUpdates}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Calendar API ${res.status}`);
  }

  const json = (await res.json()) as { id?: string; htmlLink?: string };
  return { id: json.id ?? "", htmlLink: json.htmlLink };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatLocalOffsetDateTime(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const H = pad(d.getHours());
  const M = pad(d.getMinutes());
  const S = pad(d.getSeconds());
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return `${yyyy}-${mo}-${da}T${H}:${M}:${S}${sign}${oh}:${om}`;
}

/** Build RFC3339 in the user’s current offset from local wall clock YYYY-MM-DD + HH:mm (or HTML time `HH:mm:ss`). */
export function localWallTimeToRFC3339(dateStr: string, timeStr: string): string | null {
  if (!ISO_DATE_RE.test(dateStr)) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hh = Number.parseInt(parts[0] ?? "", 10);
  const mm = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const hhS = String(hh).padStart(2, "0");
  const mmS = String(mm).padStart(2, "0");
  const d = new Date(`${dateStr}T${hhS}:${mmS}:00`);
  return formatLocalOffsetDateTime(d);
}

/** Add wall-clock minutes to an RFC3339 instant, re-encoded with the local offset at the end instant. */
export function addMinutesToRFC3339(rfcStart: string, minutes: number): string | null {
  const d = new Date(rfcStart);
  if (Number.isNaN(d.getTime())) return null;
  d.setTime(d.getTime() + minutes * 60 * 1000);
  return formatLocalOffsetDateTime(d);
}
