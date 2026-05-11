export type GuerangerDayJson = {
  title?: string;
  reflection?: string;
  collect?: string;
  readings?: string;
};

export async function fetchGuerangerForDay(
  monthDay: string
): Promise<GuerangerDayJson | null> {
  try {
    const res = await fetch(`/family-dashboard/gueranger.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, GuerangerDayJson | string>;
    const entry = data[monthDay];
    if (!entry || typeof entry === "string") return null;
    return entry;
  } catch {
    return null;
  }
}
