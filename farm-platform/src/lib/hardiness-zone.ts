/**
 * USDA Plant Hardiness Zone lookup using Open-Meteo historical weather data.
 * Fetches 5 years of daily minimum temperatures, finds the average annual
 * extreme minimum, and maps it to the correct USDA zone + subzone.
 */

const ZONE_THRESHOLDS: Array<{ zone: string; minF: number }> = [
  { zone: "13b", minF: 65 },
  { zone: "13a", minF: 60 },
  { zone: "12b", minF: 55 },
  { zone: "12a", minF: 50 },
  { zone: "11b", minF: 45 },
  { zone: "11a", minF: 40 },
  { zone: "10b", minF: 35 },
  { zone: "10a", minF: 30 },
  { zone: "9b", minF: 25 },
  { zone: "9a", minF: 20 },
  { zone: "8b", minF: 15 },
  { zone: "8a", minF: 10 },
  { zone: "7b", minF: 5 },
  { zone: "7a", minF: 0 },
  { zone: "6b", minF: -5 },
  { zone: "6a", minF: -10 },
  { zone: "5b", minF: -15 },
  { zone: "5a", minF: -20 },
  { zone: "4b", minF: -25 },
  { zone: "4a", minF: -30 },
  { zone: "3b", minF: -35 },
  { zone: "3a", minF: -40 },
  { zone: "2b", minF: -45 },
  { zone: "2a", minF: -50 },
  { zone: "1b", minF: -55 },
  { zone: "1a", minF: -60 },
];

function tempFToZone(avgExtremeMinF: number): string {
  for (const { zone, minF } of ZONE_THRESHOLDS) {
    if (avgExtremeMinF >= minF) return zone;
  }
  return "1a";
}

export async function lookupHardinessZone(lat: number, lng: number): Promise<string | null> {
  try {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 4;
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
      `&daily=temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`;

    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    const dates: string[] = data?.daily?.time ?? [];
    const mins: (number | null)[] = data?.daily?.temperature_2m_min ?? [];

    if (dates.length === 0) return null;

    const yearMins = new Map<number, number>();
    for (let i = 0; i < dates.length; i++) {
      const t = mins[i];
      if (t == null) continue;
      const year = Number(dates[i].slice(0, 4));
      const prev = yearMins.get(year);
      if (prev == null || t < prev) yearMins.set(year, t);
    }

    if (yearMins.size === 0) return null;

    let sum = 0;
    for (const v of yearMins.values()) sum += v;
    const avgExtremeMinF = sum / yearMins.size;

    return tempFToZone(avgExtremeMinF);
  } catch {
    return null;
  }
}
