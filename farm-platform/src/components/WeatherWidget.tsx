"use client";

import { useEffect, useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";

interface WeatherData {
  current: { temperature: number; weatherCode: number };
  daily: Array<{ date: string; tempMax: number; tempMin: number; weatherCode: number }>;
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Showers",
  81: "Mod. showers", 82: "Heavy showers", 95: "Thunderstorm",
};

export default function WeatherWidget() {
  const profile = useFarmStore((s) => s.profile);
  const center = useMapStore((s) => s.center);
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  const lat = profile.locationLat ?? center[1];
  const lng = profile.locationLng ?? center[0];

  useEffect(() => {
    if (!lat || !lng || Math.abs(lat) < 1) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&forecast_days=5&timezone=auto`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData({
          current: {
            temperature: Math.round(json.current.temperature_2m),
            weatherCode: json.current.weather_code,
          },
          daily: json.daily.time.map((d: string, i: number) => ({
            date: d,
            tempMax: Math.round(json.daily.temperature_2m_max[i]),
            tempMin: Math.round(json.daily.temperature_2m_min[i]),
            weatherCode: json.daily.weather_code[i],
          })),
        });
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, [lat, lng]);

  if (error || !data) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 shadow-lg">
      <div className="text-sm font-semibold text-text-primary">
        {data.current.temperature}°F
      </div>
      <div className="text-xs text-text-secondary">
        {WEATHER_LABELS[data.current.weatherCode] ?? ""}
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex gap-2">
        {data.daily.slice(1, 4).map((d) => (
          <div key={d.date} className="text-center">
            <div className="text-[10px] text-text-muted">{new Date(d.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="text-[10px] text-text-primary">{d.tempMax}°/{d.tempMin}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}
