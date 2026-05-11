import Romcal from "romcal";

/** US-style moveable feasts on Sundays — common parish practice. */
const romcal = new Romcal({
  epiphanyOnSunday: true,
  ascensionOnSunday: true,
  corpusChristiOnSunday: true,
});

function titleCaseToken(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Readable label from romcal id (e.g. nativity_of_the_lord). */
export function displayLiturgyId(id: string): string {
  return id
    .split(/_|\.|:|\//g)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

export type LiturgySummary = {
  isoDate: string;
  primaryName: string;
  rankLabel: string;
  colorLabels: string[];
  seasonLabels: string[];
  optionalFeasts: string[];
  holyDayOfObligation: boolean;
};

export async function getLiturgyForDate(d: Date): Promise<LiturgySummary | null> {
  const y = d.getFullYear();
  const iso = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cal = await romcal.generateCalendar(y);
  const days = cal[iso] as Array<{ id: string; rank: string; colors: string[]; seasons: string[]; isHolyDayOfObligation: boolean; isOptional?: boolean }> | undefined;
  if (!days?.length) return null;
  const primary = days[0];
  const optionalFeasts = days.slice(1).map((x) => {
    const label = displayLiturgyId(x.id);
    return x.isOptional ? `${label} (optional)` : label;
  });

  return {
    isoDate: iso,
    primaryName: displayLiturgyId(primary.id),
    rankLabel: displayLiturgyId(primary.rank),
    colorLabels: primary.colors.map((c) => displayLiturgyId(c)),
    seasonLabels: primary.seasons.map((s) => displayLiturgyId(s.replace(/_/g, " "))),
    optionalFeasts: optionalFeasts.slice(0, 5),
    holyDayOfObligation: primary.isHolyDayOfObligation,
  };
}
