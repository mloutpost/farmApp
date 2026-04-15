"use client";

import { useEffect, useMemo, useState } from "react";
import { useFarmStore } from "@/store/farm-store";

interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

interface DayData {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProb: number;
  precipSum: number;
  weatherCode: number;
}

interface WeatherData {
  current: CurrentWeather;
  daily: DayData[];
  fetchedAt: number;
}

const WMO: Record<number, [string, string]> = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤"], 2: ["Partly Cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫"], 48: ["Rime Fog", "🌫"],
  51: ["Light Drizzle", "🌦"], 53: ["Drizzle", "🌦"], 55: ["Heavy Drizzle", "🌦"],
  61: ["Light Rain", "🌧"], 63: ["Rain", "🌧"], 65: ["Heavy Rain", "🌧"],
  71: ["Light Snow", "🌨"], 73: ["Snow", "🌨"], 75: ["Heavy Snow", "❄️"],
  77: ["Snow Grains", "❄️"], 80: ["Showers", "🌧"], 81: ["Mod. Showers", "🌧"],
  82: ["Heavy Showers", "🌧"], 95: ["Thunderstorm", "⛈"], 96: ["Hail Storm", "⛈"],
  99: ["Severe Storm", "⛈"],
};

const wx = (code: number): [string, string] => WMO[code] ?? ["Unknown", "❓"];

const CACHE_KEY = "farm-weather-v2";
const CACHE_TTL = 30 * 60_000;

function getCached(lat: number, lng: number): WeatherData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.lat === lat && c.lng === lng && Date.now() - c.data.fetchedAt < CACHE_TTL)
      return c.data;
  } catch {
    /* empty */
  }
  return null;
}

function setCache(lat: number, lng: number, data: WeatherData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, data }));
  } catch {
    /* empty */
  }
}

const GDD_MILESTONES = [
  { gdd: 100, label: "Peas/Lettuce" },
  { gdd: 300, label: "Beans" },
  { gdd: 500, label: "Tomato bloom" },
  { gdd: 1000, label: "Corn silk" },
  { gdd: 1400, label: "Corn mature" },
  { gdd: 2500, label: "Full season" },
];

function calcGDD(daily: DayData[], lastFrost?: string): number {
  const year = new Date().getFullYear();
  const startStr =
    lastFrost && lastFrost.length <= 5
      ? `${year}-${lastFrost}`
      : lastFrost
        ? `${year}-${lastFrost.slice(5)}`
        : `${year}-03-15`;
  const todayStr = new Date().toISOString().slice(0, 10);
  let total = 0;
  for (const d of daily) {
    if (d.date < startStr || d.date > todayStr) continue;
    const avg = (d.tempMax + d.tempMin) / 2;
    if (avg > 50) total += avg - 50;
  }
  return Math.round(total);
}

export type WeatherWidgetVariant = "default" | "compact" | "hud";

export default function WeatherWidget({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  /** `hud` = large always-on layout for wall displays; ignores `compact` */
  variant?: WeatherWidgetVariant;
}) {
  const profile = useFarmStore((s) => s.profile);
  const isHud = variant === "hud";
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact && !isHud);

  const lat = profile.locationLat;
  const lng = profile.locationLng;

  useEffect(() => {
    if (!lat || !lng) return;
    const hit = getCached(lat, lng);
    if (hit) {
      setData(hit);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
      `&timezone=auto&past_days=92&forecast_days=7`;

    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((j) => {
        const wd: WeatherData = {
          current: {
            temperature: Math.round(j.current.temperature_2m),
            humidity: Math.round(j.current.relative_humidity_2m),
            windSpeed: Math.round(j.current.wind_speed_10m),
            weatherCode: j.current.weather_code,
          },
          daily: j.daily.time.map((date: string, i: number) => ({
            date,
            tempMax: Math.round(j.daily.temperature_2m_max[i]),
            tempMin: Math.round(j.daily.temperature_2m_min[i]),
            precipProb: j.daily.precipitation_probability_max?.[i] ?? 0,
            precipSum: j.daily.precipitation_sum?.[i] ?? 0,
            weatherCode: j.daily.weather_code[i],
          })),
          fetchedAt: Date.now(),
        };
        setData(wd);
        setCache(lat, lng, wd);
      })
      .catch(() => {
        if (!ac.signal.aborted) setError("Failed to load weather");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [lat, lng]);

  const today = new Date().toISOString().slice(0, 10);

  const forecast = useMemo(
    () => (data ? data.daily.filter((d) => d.date >= today).slice(0, 7) : []),
    [data, today],
  );

  const frostDays = useMemo(() => forecast.filter((d) => d.tempMin <= 32), [forecast]);

  const precip = useMemo(() => {
    if (!data) return { d7: 0, d30: 0 };
    const sum = (days: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const c = cutoff.toISOString().slice(0, 10);
      return data.daily
        .filter((d) => d.date >= c && d.date <= today)
        .reduce((s, d) => s + d.precipSum, 0);
    };
    return { d7: sum(7), d30: sum(30) };
  }, [data, today]);

  const gdd = useMemo(
    () => (data ? calcGDD(data.daily, profile.lastFrostSpring) : 0),
    [data, profile.lastFrostSpring],
  );

  const milestone = useMemo(() => {
    const next = GDD_MILESTONES.find((m) => m.gdd > gdd) ?? GDD_MILESTONES.at(-1)!;
    const prevIdx = GDD_MILESTONES.indexOf(next) - 1;
    const prev = prevIdx >= 0 ? GDD_MILESTONES[prevIdx] : { gdd: 0, label: "Start" };
    const range = next.gdd - prev.gdd;
    const pct = range > 0 ? ((gdd - prev.gdd) / range) * 100 : 100;
    return { prev, next, pct: Math.max(2, Math.min(100, pct)) };
  }, [gdd]);

  const hudShell = isHud ? "rounded-2xl border border-border bg-bg-elevated/95 p-6 min-h-[200px]" : "";

  if (!lat || !lng)
    return (
      <div
        className={`rounded-lg bg-bg-surface border border-border px-3 py-2 text-xs text-text-muted ${isHud ? "text-sm p-6" : ""}`}
      >
        Set your farm location in Settings to see weather.
      </div>
    );

  if (loading && !data)
    return (
      <div
        className={`rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs text-text-muted animate-pulse ${isHud ? "p-8 text-base" : ""}`}
      >
        Loading weather&hellip;
      </div>
    );

  if (error && !data)
    return (
      <div className={`rounded-lg bg-bg-surface border border-border px-3 py-2 text-xs text-red-400 ${isHud ? "p-6 text-sm" : ""}`}>
        {error}
      </div>
    );

  if (!data) return null;

  const [label, emoji] = wx(data.current.weatherCode);

  const fmtDay = (d: string) =>
    new Date(d + "T12:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  if (isHud) {
    return (
      <div className={`${hudShell} flex flex-col h-full min-h-0 overflow-hidden`}>
        <div className="flex flex-wrap items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-5xl md:text-6xl leading-none" aria-hidden>
              {emoji}
            </span>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-text-primary tabular-nums leading-none">
                {data.current.temperature}°F
              </div>
              <div className="text-sm md:text-base text-text-secondary mt-1">{label}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm md:text-base text-text-secondary">
            <span>Humidity {data.current.humidity}%</span>
            <span>Wind {data.current.windSpeed} mph</span>
            {profile.hardinessZone && <span className="text-text-muted">Zone {profile.hardinessZone}</span>}
          </div>
        </div>

        {frostDays.length > 0 && (
          <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/25 px-4 py-2 text-sm text-blue-200">
            <span className="font-semibold">Frost alert</span> — Lows ≤32°F:{" "}
            {frostDays.map((d) => fmtDay(d.date)).join(", ")}
          </div>
        )}

        <div className="mt-4 grid grid-cols-7 gap-1 text-center shrink-0">
          {forecast.map((d) => {
            const [, de] = wx(d.weatherCode);
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 rounded-lg bg-bg-surface/50 py-2">
                <span className="text-[10px] md:text-xs text-text-muted uppercase">
                  {new Date(d.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3)}
                </span>
                <span className="text-xl md:text-2xl leading-none">{de}</span>
                <span className="text-sm md:text-base font-semibold text-text-primary">{d.tempMax}°</span>
                <span className={`text-xs ${d.tempMin <= 32 ? "text-blue-400 font-semibold" : "text-text-muted"}`}>
                  {d.tempMin}°
                </span>
                {d.precipProb > 0 && <span className="text-[10px] text-accent">{d.precipProb}%</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-8 border-t border-border pt-4 text-sm md:text-base">
          <div>
            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">GDD (base 50°F)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-text-primary tabular-nums">{gdd}</span>
              <span className="text-text-secondary text-xs md:text-sm">
                {milestone.prev.label} → {milestone.next.label}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden mt-2 max-w-xs">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${milestone.pct}%` }} />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">Rain 7d / 30d</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">
              {precip.d7.toFixed(2)}″ / {precip.d30.toFixed(2)}″
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!expanded)
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 shadow-lg hover:bg-bg-surface transition-colors"
      >
        <span className="text-lg leading-none">{emoji}</span>
        <span className="text-sm font-semibold text-text-primary">
          {data.current.temperature}°F
        </span>
        {frostDays.length > 0 && (
          <span className="text-sm" title="Frost warning in forecast">
            🥶
          </span>
        )}
      </button>
    );

  return (
    <div className="w-80 rounded-xl bg-bg-elevated/95 backdrop-blur border border-border shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl leading-none">{emoji}</span>
          <div>
            <div className="text-2xl font-bold text-text-primary leading-tight">
              {data.current.temperature}°F
            </div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-text-muted hover:text-text-primary text-sm p-1 rounded-md hover:bg-bg-surface transition-colors"
          title="Collapse weather"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
      </div>

      <div className="flex gap-4 px-4 pb-3 text-xs text-text-secondary">
        <span>💧 {data.current.humidity}%</span>
        <span>💨 {data.current.windSpeed} mph</span>
        {profile.hardinessZone && (
          <span className="text-text-muted">Zone {profile.hardinessZone}</span>
        )}
      </div>

      {frostDays.length > 0 && (
        <div className="mx-3 mb-2 rounded-lg bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 text-xs text-blue-300">
          <span className="font-semibold">❄️ Frost Alert</span> — Lows ≤32°F:{" "}
          {frostDays.map((d) => fmtDay(d.date)).join(", ")}
        </div>
      )}

      <Divider />

      <Section title="7-Day Forecast">
        <div className="grid grid-cols-7 gap-1 text-center">
          {forecast.map((d) => {
            const [, de] = wx(d.weatherCode);
            return (
              <div key={d.date} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-text-muted">
                  {new Date(d.date + "T12:00")
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .slice(0, 2)}
                </span>
                <span className="text-sm leading-none">{de}</span>
                <span className="text-[10px] font-medium text-text-primary">
                  {d.tempMax}°
                </span>
                <span
                  className={`text-[10px] ${d.tempMin <= 32 ? "text-blue-400 font-semibold" : "text-text-muted"}`}
                >
                  {d.tempMin}°
                </span>
                {d.precipProb > 0 && (
                  <span className="text-[9px] text-accent">{d.precipProb}%</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Divider />

      <Section title="Growing Degree Days">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-lg font-bold text-text-primary">{gdd}</span>
          <span className="text-[11px] text-text-secondary">GDD (base 50°F)</span>
        </div>
        <div className="h-2 rounded-full bg-bg overflow-hidden mb-1">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${milestone.pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>
            {milestone.prev.label} ({milestone.prev.gdd})
          </span>
          <span>
            {milestone.next.label} ({milestone.next.gdd})
          </span>
        </div>
      </Section>

      <Divider />

      <div className="flex gap-6 px-4 py-3">
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">
            Rain 7d
          </div>
          <div className="text-sm font-semibold text-text-primary">
            {precip.d7.toFixed(2)}&Prime;
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">
            Rain 30d
          </div>
          <div className="text-sm font-semibold text-text-primary">
            {precip.d30.toFixed(2)}&Prime;
          </div>
        </div>
      </div>

    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}
