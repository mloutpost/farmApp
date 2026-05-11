/** WMO-ish labels for Open-Meteo weather codes (day simplification). */
function weatherPhrase(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Mostly clear";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Storm possible";
  return "";
}

export type WeatherBrief = {
  line: string;
};

const DEFAULT_LAT = 39.8283;
const DEFAULT_LON = -98.5795;

export function dashboardLatLon(): { lat: number; lon: number } {
  const lat = parseFloat(process.env.NEXT_PUBLIC_FAMILY_DASHBOARD_LAT ?? "");
  const lon = parseFloat(process.env.NEXT_PUBLIC_FAMILY_DASHBOARD_LON ?? "");
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

export async function fetchWeatherBrief(lat: number, lon: number): Promise<WeatherBrief> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) return { line: "Weather unavailable" };
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
  };
  const cur = data.current;
  const hi = data.daily?.temperature_2m_max?.[0];
  const lo = data.daily?.temperature_2m_min?.[0];
  if (cur?.temperature_2m == null) return { line: "Weather unavailable" };
  const phrase = weatherPhrase(cur.weather_code ?? 0);
  const t = Math.round(cur.temperature_2m);
  if (hi != null && lo != null) {
    return {
      line: `${phrase}, ${t}°F | Lo: ${Math.round(lo)}°F | Hi: ${Math.round(hi)}°F`,
    };
  }
  return { line: `${phrase}, ${t}°F` };
}
