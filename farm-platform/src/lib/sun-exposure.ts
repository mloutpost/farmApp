/**
 * Sun exposure lookup: tries Google Solar API first (best accuracy near
 * buildings), then falls back to Open-Meteo sunshine duration data which
 * works for any lat/lng worldwide.
 */

export interface SunExposureResult {
  sunshineHoursPerYear: number;
  category: "full" | "partial" | "shade";
  source: "google-solar" | "open-meteo" | "estimate";
}

function categorize(hoursPerYear: number): "full" | "partial" | "shade" {
  if (hoursPerYear >= 2000) return "full";
  if (hoursPerYear >= 1400) return "partial";
  return "shade";
}

async function tryGoogleSolar(lat: number, lng: number, apiKey: string): Promise<SunExposureResult | null> {
  try {
    const params = new URLSearchParams({
      "location.latitude": lat.toFixed(5),
      "location.longitude": lng.toFixed(5),
      required_quality: "BASE",
      key: apiKey,
    });
    const resp = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`
    );
    if (!resp.ok) return null;

    const data = await resp.json();
    const hours = data?.solarPotential?.maxSunshineHoursPerYear;
    if (typeof hours !== "number" || hours <= 0) return null;

    return {
      sunshineHoursPerYear: Math.round(hours),
      category: categorize(hours),
      source: "google-solar",
    };
  } catch {
    return null;
  }
}

async function tryOpenMeteo(lat: number, lng: number): Promise<SunExposureResult | null> {
  try {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 2;
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
      `&daily=sunshine_duration&timezone=auto`;

    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    const dates: string[] = data?.daily?.time ?? [];
    const durations: (number | null)[] = data?.daily?.sunshine_duration ?? [];

    if (dates.length === 0) return null;

    const yearTotals = new Map<number, number>();
    for (let i = 0; i < dates.length; i++) {
      const d = durations[i];
      if (d == null) continue;
      const year = Number(dates[i].slice(0, 4));
      yearTotals.set(year, (yearTotals.get(year) ?? 0) + d);
    }

    if (yearTotals.size === 0) return null;

    let sum = 0;
    for (const v of yearTotals.values()) sum += v;
    const avgSecondsPerYear = sum / yearTotals.size;
    const hoursPerYear = avgSecondsPerYear / 3600;

    return {
      sunshineHoursPerYear: Math.round(hoursPerYear),
      category: categorize(hoursPerYear),
      source: "open-meteo",
    };
  } catch {
    return null;
  }
}

/**
 * Lookup sun exposure for a location. Tries Google Solar API first (if key
 * provided), then Open-Meteo, then a basic latitude estimate.
 */
export async function lookupSunExposure(
  lat: number,
  lng: number,
  googleApiKey?: string
): Promise<SunExposureResult> {
  if (googleApiKey) {
    const solar = await tryGoogleSolar(lat, lng, googleApiKey);
    if (solar) return solar;
  }

  const meteo = await tryOpenMeteo(lat, lng);
  if (meteo) return meteo;

  const absLat = Math.abs(lat);
  const estimated = absLat < 25 ? 2800 : absLat < 35 ? 2400 : absLat < 45 ? 2000 : absLat < 55 ? 1600 : 1200;
  return {
    sunshineHoursPerYear: estimated,
    category: categorize(estimated),
    source: "estimate",
  };
}
