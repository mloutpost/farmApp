/**
 * Google Calendar helpers for Family Dashboard schedule.
 *
 * `fetchTodayEvents` queries every calendar that is **shown in Google's own
 * calendar UI** (`calendarList` + `selected` / `hidden` flags). The old behaviour
 * of only hitting `primary` misses subscribed family calendars, school
 * ICS feeds, parish calendars, etc.—which reads as “wrong calendar data”.
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  /** ISO 8601 start time. For all-day events this is a date (YYYY-MM-DD). */
  start: string;
  /** ISO 8601 end time, when present. */
  end?: string;
  location?: string;
  /** True when the event has a date but no time (all-day). */
  allDay: boolean;
  /** Source calendar ID when merged across multiple subscribed calendars. */
  calendarId?: string;
}

interface RawEvent {
  id?: string;
  summary?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface RawListResponse {
  items?: RawEvent[];
  error?: { message?: string };
  nextPageToken?: string;
}

interface RawCalendarListEntry {
  id?: string;
  summary?: string;
  /** When false the calendar sidebar checkbox is cleared — omit from merged view (matches google.com UX). */
  selected?: boolean;
  hidden?: boolean;
  deleted?: boolean;
  accessRole?: string;
}

interface RawCalendarListResponse {
  items?: RawCalendarListEntry[];
  error?: { message?: string };
  nextPageToken?: string;
}

const PER_CALENDAR_MAX_RESULTS = 35;
const MERGED_TOTAL_CAP = 80;

/** Builds UTC instants matching [today 00:00, tomorrow 00:00) for the browser TZ. */
function todayWindowUtc(now: Date): { timeMin: string; timeMax: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function defaultTimeZone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function eventListUrl(baseUrl: string, calendarId: string): URL {
  return new URL(
    `${baseUrl}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
}

function parseCalendarError(bodyJson: RawListResponse | RawCalendarListResponse): string {
  return bodyJson.error?.message?.trim() ?? "";
}

async function googleJsonOrThrow(
  url: URL | string,
  accessToken: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal
): Promise<Response> {
  const res = await fetchImpl(`${url}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as RawListResponse;
      detail = parseCalendarError(body);
    } catch {
      /* ignore */
    }
    throw new Error(`Google Calendar request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res;
}

async function fetchVisibleCalendarIds(
  accessToken: string,
  opts: { baseUrl: string; fetchImpl: typeof fetch; signal?: AbortSignal }
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${opts.baseUrl}/calendar/v3/users/me/calendarList`);
    url.searchParams.set("minAccessRole", "reader");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await googleJsonOrThrow(url, accessToken, opts.fetchImpl, opts.signal);
    const json = (await res.json()) as RawCalendarListResponse;
    for (const entry of json.items ?? []) {
      const id = entry.id;
      if (!id) continue;
      if (entry.deleted === true) continue;
      if (entry.hidden === true) continue;
      if (entry.selected === false) continue;
      const role = entry.accessRole ?? "";
      if (!["owner", "writer", "reader"].includes(role)) continue;
      ids.push(id);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  /* De-dupe (primary + email duplicates can occasionally appear). */
  return [...new Set(ids)];
}

/** Stable unique id when the same invitation could surface on two calendars. */
function mergedEventCompositeId(calendarId: string, googleEventId: string): string {
  return `${calendarId}❖${googleEventId}`;
}

function rawEventsToModels(
  items: RawEvent[],
  calendarId: string
): GoogleCalendarEvent[] {
  const out: GoogleCalendarEvent[] = [];
  for (const it of items) {
    if (!it.id || it.status === "cancelled") continue;
    const startDateTime = it.start?.dateTime;
    const startDate = it.start?.date;
    const endDateTime = it.end?.dateTime;
    const endDate = it.end?.date;
    const start = startDateTime ?? startDate;
    if (!start) continue;
    out.push({
      id: mergedEventCompositeId(calendarId, it.id),
      summary: (it.summary ?? "(no title)").trim(),
      start,
      end: endDateTime ?? endDate,
      location: it.location?.trim() || undefined,
      allDay: !startDateTime,
      calendarId,
    });
  }
  return out;
}

async function fetchSingleCalendarToday(
  accessToken: string,
  opts: FetchTodayEventsOptions & { baseUrl: string; calendarIdForIds: string; fetchImpl: typeof fetch }
): Promise<GoogleCalendarEvent[]> {
  const { timeMin, timeMax } = todayWindowUtc(opts.now ?? new Date());
  const tz = opts.timeZone ?? defaultTimeZone();
  const url = eventListUrl(opts.baseUrl, opts.calendarId ?? "primary");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("timeZone", tz);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(opts.maxResultsPerCalendar ?? PER_CALENDAR_MAX_RESULTS));

  const res = await googleJsonOrThrow(url, accessToken, opts.fetchImpl, opts.signal);
  const json = (await res.json()) as RawListResponse;
  return rawEventsToModels(json.items ?? [], opts.calendarIdForIds);
}

export interface FetchTodayEventsOptions {
  /** Override the "now" used to build the window (mainly for tests). */
  now?: Date;
  /** IANA TZ for recurring expansion + all-day semantics (defaults to runtime TZ). */
  timeZone?: string;
  /** Allow swapping the API base URL. */
  baseUrl?: string;
  /** Network fetch (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /**
   * When set, queries only this calendar (`primary`, email address, etc.).
   * When omitted, all **visible** calendars from `calendarList` are queried
   * and merged — matching the layered view on google.com/calendar.
   */
  calendarId?: string;
  /** Per-calendar cap when fetching multiple calendars before merge & sort. */
  maxResultsPerCalendar?: number;
}

export async function fetchTodayEvents(
  accessToken: string,
  opts: FetchTodayEventsOptions = {}
): Promise<GoogleCalendarEvent[]> {
  const baseUrl = opts.baseUrl ?? "https://www.googleapis.com";
  const fetchImpl = opts.fetchImpl ?? fetch;

  const singleId = opts.calendarId;
  if (singleId !== undefined && singleId.length > 0) {
    return fetchSingleCalendarToday(accessToken, {
      ...opts,
      baseUrl,
      calendarId: singleId,
      calendarIdForIds: singleId,
      fetchImpl,
    });
  }

  /** Default path: mimic google.com aggregated view across checked calendars. */
  try {
    const calendarIds = await fetchVisibleCalendarIds(accessToken, {
      baseUrl,
      fetchImpl,
      signal: opts.signal,
    });
    const targets =
      calendarIds.length > 0 ? calendarIds : ["primary"];

    const settled = await Promise.allSettled(
      targets.map((calId) =>
        fetchSingleCalendarToday(accessToken, {
          ...opts,
          calendarId: calId,
          calendarIdForIds: calId,
          baseUrl,
          fetchImpl,
        })
      )
    );

    const merged: GoogleCalendarEvent[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") merged.push(...s.value);
    }

    merged.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.start.localeCompare(b.start);
    });

    if (merged.length > MERGED_TOTAL_CAP) merged.length = MERGED_TOTAL_CAP;
    return merged;
  } catch {
    /* Fallback: older behaviour if calendar list is denied or flaky. */
    return fetchSingleCalendarToday(accessToken, {
      ...opts,
      calendarId: "primary",
      calendarIdForIds: "primary",
      baseUrl,
      fetchImpl,
    });
  }
}

const CALENDAR_CONSOLE_OVERVIEW =
  "https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview";

/**
 * When Google rejects `events.list` with HTTP 403 because the Calendar API was
 * never enabled on the OAuth client's GCP project, `fetchTodayEvents` surfaces
 * a long message. Extract a Console link so the dashboard can open the fix in one tap.
 *
 * Apps cannot enable APIs programmatically without admin credentials—the owner must click **Enable** in Cloud Console.
 */
export function calendarConsoleEnableLink(errorMessage: string): string | null {
  const t = errorMessage.trim();
  const is403 =
    /\(\s*403\s*\)/.test(t) || /^Google Calendar request failed\s*\(\s*403\s*\)/i.test(t);
  if (!is403) return null;
  const mentionsDisabledApi =
    /Google Calendar API has not been used/i.test(t) ||
    /Calendar API.*not been enabled/i.test(t) ||
    /it is disabled/i.test(t) ||
    /SERVICE_DISABLED/i.test(t);
  if (!mentionsDisabledApi) return null;

  let url =
    t.match(/https:\/\/console\.developers\.google\.com\/[^\s)<>'"]+/i)?.[0] ??
    null;
  if (url) url = url.replace(/[,.)]+$/, "");

  if (!url) {
    const afterProjectWord = t.match(/project\D+(\d{6,})/i)?.[1];
    const twelve = t.match(/\b(\d{12})\b/)?.[1];
    const projectId = afterProjectWord ?? twelve;
    if (projectId) url = `${CALENDAR_CONSOLE_OVERVIEW}?project=${encodeURIComponent(projectId)}`;
  }

  return url;
}

/** Local-time formatter for an event start, used by the dashboard. */
export function formatEventTimeChip(ev: GoogleCalendarEvent): string {
  if (ev.allDay) return "ALL DAY";
  const d = new Date(ev.start);
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase()
    .replace(" ", "");
}
