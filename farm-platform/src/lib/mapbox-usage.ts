/**
 * Mapbox usage tracking for free tier awareness.
 * Free tier: 50,000 map loads/month. We track map loads client-side
 * since Mapbox has no programmatic Usage API.
 */

const STORAGE_KEY = "farm-platform-mapbox-usage";
const MONTH_KEY = "farm-platform-mapbox-month";

/** In dev, use a low limit so you can test the alert. Set NEXT_PUBLIC_MAPBOX_TEST_LIMIT=5 */
const TEST_LIMIT = typeof process !== "undefined" && process.env.NEXT_PUBLIC_MAPBOX_TEST_LIMIT
  ? parseInt(process.env.NEXT_PUBLIC_MAPBOX_TEST_LIMIT, 10)
  : null;

export const MAPBOX_LIMITS = {
  /** Free tier map loads per month (50k). Override with NEXT_PUBLIC_MAPBOX_TEST_LIMIT for testing. */
  mapLoadsPerMonth: TEST_LIMIT ?? 50_000,
  /** Show warning when usage exceeds this % */
  warnThresholdPercent: 80,
  /** Show critical alert when usage exceeds this % */
  criticalThresholdPercent: 95,
} as const;

export type UsageLevel = "ok" | "warn" | "critical" | "over";

export interface UsageState {
  mapLoads: number;
  month: string;
  limit: number;
  percentUsed: number;
  level: UsageLevel;
  isNearLimit: boolean;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function loadFromStorage(): { mapLoads: number; month: string } {
  if (typeof window === "undefined") {
    return { mapLoads: 0, month: getCurrentMonth() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const month = localStorage.getItem(MONTH_KEY) ?? getCurrentMonth();
    const currentMonth = getCurrentMonth();

    if (month !== currentMonth) {
      return { mapLoads: 0, month: currentMonth };
    }

    const mapLoads = raw ? parseInt(raw, 10) : 0;
    return { mapLoads: isNaN(mapLoads) ? 0 : mapLoads, month: currentMonth };
  } catch {
    return { mapLoads: 0, month: getCurrentMonth() };
  }
}

function saveToStorage(mapLoads: number, month: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(mapLoads));
    localStorage.setItem(MONTH_KEY, month);
  } catch {
    // Quota exceeded or private mode
  }
}

function computeLevel(percentUsed: number): UsageLevel {
  if (percentUsed >= 100) return "over";
  if (percentUsed >= MAPBOX_LIMITS.criticalThresholdPercent) return "critical";
  if (percentUsed >= MAPBOX_LIMITS.warnThresholdPercent) return "warn";
  return "ok";
}

export function getUsageState(): UsageState {
  const { mapLoads, month } = loadFromStorage();
  const limit = MAPBOX_LIMITS.mapLoadsPerMonth;
  const percentUsed = limit > 0 ? Math.min(100, (mapLoads / limit) * 100) : 0;
  const level = computeLevel(percentUsed);
  const isNearLimit =
    level === "warn" || level === "critical" || level === "over";

  return {
    mapLoads,
    month,
    limit,
    percentUsed,
    level,
    isNearLimit,
  };
}

/**
 * Record a map load. Call this when the Mapbox Map is initialized.
 * Returns the new total for the current month.
 */
export function recordMapLoad(): number {
  const { mapLoads, month } = loadFromStorage();
  const currentMonth = getCurrentMonth();

  const newLoads =
    month !== currentMonth ? 1 : Math.min(mapLoads + 1, MAPBOX_LIMITS.mapLoadsPerMonth + 1);
  const newMonth = month !== currentMonth ? currentMonth : month;

  saveToStorage(newLoads, newMonth);
  return newLoads;
}
