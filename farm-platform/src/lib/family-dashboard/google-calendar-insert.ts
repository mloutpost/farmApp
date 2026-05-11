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
  const cal = encodeURIComponent(input.calendarId ?? "primary");
  const attendees = input.attendeeEmails
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .map((email) => ({ email }));

  const endExclusive = addDaysIso(input.endDate, 1);

  const body: Record<string, unknown> = {
    summary: input.summary,
    start: { date: input.startDate },
    end: { date: endExclusive },
  };
  if (input.description?.trim()) body.description = input.description.trim();
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
