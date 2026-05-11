"use client";

import { useEffect, useState } from "react";
import { EB_Garamond, Cormorant_Garamond } from "next/font/google";
import {
  ROSARY_SOURCE,
  SOURCE_PIUS_XI_INGRAVESCENTIBUS,
  type RosaryForDay,
  type RosaryMystery,
} from "@/lib/family-dashboard/rosary";
import { PROVENCE, PARCHMENT_TEXTURE } from "@/lib/family-dashboard/dashboard-tokens";

const dashboardSerif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-dashboard-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const dashboardDisplaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-dashboard-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const ROSARY_AUTO_ADVANCE_MS = 23000;
const ROSARY_WIDE_GRID_MEDIA = "(min-width: 960px) and (min-height: 520px)" as const;

function useMediaFlag(mediaQuery: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(mediaQuery);
    const sync = (): void => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return (): void => mq.removeEventListener("change", sync);
  }, [mediaQuery]);
  return matches;
}

function RosaryTraditionalCard({
  myst,
  ink,
  inkSoft,
  labelCls,
  bodyCls,
  citeCls,
  meditationLabelCls,
  meditationBodyCls,
  tvGrid = false,
}: {
  myst: RosaryMystery;
  ink: string;
  inkSoft: string;
  labelCls: string;
  bodyCls: string;
  citeCls: string;
  meditationLabelCls: string;
  meditationBodyCls: string;
  tvGrid?: boolean;
}) {
  const pad = tvGrid
    ? "p-[clamp(0.51rem,calc(1.05vmin+0.21rem),0.99rem)]"
    : "p-[clamp(0.45rem,calc(0.9vmin+0.2rem),0.85rem)]";
  const scrollBlock = tvGrid ? "min-h-0 flex-1 flex flex-col gap-[0.65em] overflow-y-auto overscroll-contain pr-0.5" : "flex flex-col gap-[0.55em]";
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col rounded-sm border border-[#1f3a55]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${pad}`}
      style={{
        borderLeft: `3px solid ${PROVENCE.toileBlueDeep}`,
        background: "rgba(255,250,238,0.9)",
      }}
    >
      <p
        className={`shrink-0 border-b font-semibold uppercase ${labelCls}`}
        style={{ color: inkSoft, borderColor: "rgba(91,58,28,0.18)", paddingBottom: "0.55em", marginBottom: "0.55em" }}
      >
        Quotation
      </p>
      <div className={tvGrid ? scrollBlock : `${scrollBlock} min-h-0 flex-1`}>
        <p className={`min-h-0 shrink-0 ${bodyCls}`} style={{ color: ink }}>
          {myst.traditional.text}
        </p>
        <div
          className="shrink-0 border-t pt-[0.55em]"
          style={{ borderColor: "rgba(91,58,28,0.12)" }}
        >
          <p className={`font-semibold uppercase ${meditationLabelCls}`} style={{ color: inkSoft }}>
            Meditation
          </p>
          <p className={`mt-[0.35em] ${meditationBodyCls}`} style={{ color: ink }}>
            {myst.reflection}
          </p>
        </div>
      </div>
      <p
        className={`mt-[0.65em] shrink-0 border-t leading-tight ${citeCls}`}
        style={{ color: inkSoft, borderColor: "rgba(91,58,28,0.12)", paddingTop: "0.55em" }}
      >
        — {myst.traditional.source.shortLabel},{" "}
        <span className="font-normal">{myst.traditional.source.detail}</span>
        {" · "}
        <a
          href={myst.traditional.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
          style={{ color: PROVENCE.toileBlueDeep }}
          onClick={(e) => e.stopPropagation()}
        >
          Source
        </a>
      </p>
    </div>
  );
}

export function RosaryMysteryOverlay({
  rosaryDay,
  onClose,
}: {
  rosaryDay: RosaryForDay;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const n = rosaryDay.mysteries.length;
  const last = Math.max(0, n - 1);
  const i = Math.min(idx, last);
  const m = rosaryDay.mysteries[i]!;

  const wideFiveGrid = useMediaFlag(ROSARY_WIDE_GRID_MEDIA);
  const prefersReducedMotion = useMediaFlag("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    setIdx(0);
  }, [rosaryDay.setId, rosaryDay.weekdayLabel]);

  useEffect(() => {
    if (wideFiveGrid || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setIdx((j) => (j >= last ? 0 : j + 1));
    }, ROSARY_AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [wideFiveGrid, prefersReducedMotion, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      if (wideFiveGrid) return;
      if (e.key === "ArrowRight") setIdx((j) => (j >= last ? 0 : j + 1));
      if (e.key === "ArrowLeft") setIdx((j) => (j <= 0 ? last : j - 1));
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, last, wideFiveGrid]);

  const ink = "#2a1a08";
  const inkSoft = "#5b3a1c";
  const ordinal = ["First", "Second", "Third", "Fourth", "Fifth"];

  const titleCarousel =
    "text-[clamp(0.875rem,calc(0.5vmin+0.52rem),1.125rem)] font-semibold leading-snug text-balance";
  const titleGrid =
    "text-[clamp(0.975rem,calc(0.552vmin+0.576rem),1.425rem)] font-semibold leading-snug text-balance";
  const tradLabelCarousel =
    "tracking-[0.2em] text-[clamp(0.6rem,calc(0.32vmin+0.4rem),0.75rem)]";
  const ordinalLabelGrid =
    "tracking-[0.14em] text-[clamp(0.65rem,calc(0.32vmin+0.38rem),0.8125rem)]";
  const tradCardLabelGrid =
    "tracking-[0.18em] text-[clamp(0.92rem,calc(0.48vmin+0.52rem),1.2rem)]";
  const tradBodyCarousel =
    "leading-snug text-[clamp(0.75rem,calc(0.42vmin+0.44rem),0.9375rem)] break-words";
  const tradBodyGrid =
    "leading-relaxed text-[clamp(1.08rem,calc(0.6vmin+0.58rem),1.48rem)] break-words";
  const citeCarousel =
    "leading-tight text-[clamp(0.6rem,calc(0.29vmin+0.36rem),0.725rem)] break-words";
  const citeGrid =
    "leading-tight text-[clamp(0.84rem,calc(0.4vmin+0.48rem),1.08rem)] break-words";
  const meditateInCardLabelCarousel =
    "tracking-[0.14em] text-[clamp(0.52rem,calc(0.28vmin+0.34rem),0.625rem)]";
  const meditateInCardLabelGrid =
    "tracking-[0.12em] text-[clamp(0.7rem,calc(0.34vmin+0.38rem),0.9rem)]";
  const meditateInCardBodyCarousel =
    "leading-snug text-[clamp(0.72rem,calc(0.4vmin+0.42rem),0.9rem)] italic";
  const meditateInCardBodyGrid =
    "leading-relaxed text-[clamp(0.98rem,calc(0.52vmin+0.5rem),1.32rem)] italic";

  const insetPad = "px-[clamp(0.65rem,calc(1.45vmin+0.38rem),1.05rem)] py-[clamp(0.42rem,calc(0.95vmin+0.28rem),0.85rem)]";
  const hdrPad =
    "shrink-0 flex items-start justify-between gap-2 border-b " +
    insetPad;

  const segBtn =
    "min-h-[clamp(38px,calc(2.75vmin+30px),48px)] min-w-[clamp(40px,calc(3vmin+32px),52px)] rounded-sm border px-[clamp(0.4rem,calc(0.9vmin+0.22rem),0.65rem)] text-[clamp(11px,calc(0.28vmin+0.58rem),12.5px)] tracking-[0.12em] font-semibold uppercase transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-35";
  const segIdle = {
    borderColor: `${PROVENCE.toileBlueDeep}99`,
    color: PROVENCE.toileBlueDeep,
    background: "rgba(255,250,238,0.88)",
  } as const;

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="rosary-overlay-title"
      className={
        `fixed inset-0 z-[10002] flex items-center justify-center p-[clamp(0.35rem,calc(1.2vmin+0.22rem),0.85rem)] ` +
        `${dashboardSerif.variable} ${dashboardDisplaySerif.variable}`
      }
      style={{ background: "rgba(20, 14, 8, 0.72)" }}
    >
      <button
        type="button"
        aria-label="Close rosary"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-[min(90rem,calc(100dvw-16px))] flex-col overflow-hidden rounded-sm shadow-2xl"
        style={{
          height: "calc(100dvh - clamp(14px, 2vmin, 32px))",
          backgroundImage: PARCHMENT_TEXTURE,
          backgroundColor: PROVENCE.toileCream,
          border: `1px solid ${PROVENCE.toileBlueDeep}55`,
          boxShadow:
            "0 16px 48px rgba(20,14,8,0.45), 0 0 0 4px rgba(245,234,208,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={hdrPad} style={{ borderColor: "rgba(91,58,28,0.2)" }}>
          <div className="min-w-0 pr-1">
            <p
              id="rosary-overlay-title"
              className={
                "tracking-[0.26em] uppercase font-semibold " +
                (wideFiveGrid
                  ? "text-[clamp(0.675rem,calc(0.36vmin+0.432rem),0.825rem)]"
                  : "text-[clamp(0.5625rem,calc(0.3vmin+0.36rem),0.6875rem)]")
              }
              style={{
                color: inkSoft,
                fontFamily: "var(--font-dashboard-display), Georgia, serif",
              }}
            >
              Holy Rosary
            </p>
            <p
              className={
                "mt-[0.28em] text-balance italic leading-snug font-semibold " +
                (wideFiveGrid
                  ? "text-[clamp(1.26rem,calc(0.744vmin+0.66rem),1.8rem)]"
                  : "text-[clamp(1.05rem,calc(0.62vmin+0.55rem),1.5rem)]")
              }
              style={{
                color: PROVENCE.toileBlueDeep,
                fontFamily: "var(--font-dashboard-display), Georgia, serif",
              }}
            >
              {rosaryDay.setTitle}
            </p>
            <p
              className={
                "mt-[0.3em] " +
                (wideFiveGrid
                  ? "text-[clamp(0.78rem,calc(0.432vmin+0.48rem),1.05rem)]"
                  : "text-[clamp(0.65rem,calc(0.36vmin+0.4rem),0.875rem)]")
              }
              style={{
                color: inkSoft,
                fontStyle: "italic",
              }}
            >
              {wideFiveGrid ? (
                <>
                  {rosaryDay.weekdayLabel}
                  {" — "}customary chaplet · all five mysteries
                </>
              ) : (
                <>
                  {rosaryDay.weekdayLabel}
                  {" — "}customary chaplet · Mystery {ordinal[i]}
                  {!prefersReducedMotion && (
                    <span className="not-italic text-[0.94em]" style={{ color: inkSoft }}>
                      {" "}
                      (rotates · ← → or 1–5)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              "shrink-0 rounded-sm border tracking-[0.2em] uppercase hover:opacity-80 " +
              (wideFiveGrid
                ? "px-[clamp(0.39rem,0.81vmin,0.51rem)] text-[clamp(11px,calc(0.312vmin+0.54rem),13px)]"
                : "px-[clamp(0.45rem,1vmin,0.55rem)] text-[clamp(10px,calc(0.26vmin+0.54rem),11px)]")
            }
            style={{
              borderColor: PROVENCE.toileBlueDeep,
              color: PROVENCE.toileBlueDeep,
              background: "rgba(255,250,238,0.92)",
              fontFamily: "var(--font-dashboard-display), Georgia, serif",
              minHeight: wideFiveGrid ? "clamp(44px,calc(2.55vmin+32px),54px)" : "clamp(40px,calc(2.6vmin+32px),48px)",
              minWidth: wideFiveGrid ? "clamp(48px,calc(2.55vmin+34px),58px)" : "clamp(42px,calc(2.6vmin+34px),48px)",
            }}
          >
            Esc
          </button>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col ${insetPad}`}
          style={{
            color: ink,
            fontFamily: "var(--font-dashboard-serif), Georgia, serif",
          }}
        >
          <div
            className={
              "flex min-h-0 flex-1 flex-col " +
              (wideFiveGrid ? "" : "pt-[clamp(0.15rem,calc(0.45vmin),0.35rem)]")
            }
          >
            {wideFiveGrid ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  className="grid shrink-0 grid-cols-5 gap-[clamp(0.4rem,calc(0.95vmin),0.75rem)] border-b pb-[clamp(0.28rem,calc(0.5vmin),0.45rem)]"
                  style={{ borderColor: "rgba(91,58,28,0.14)" }}
                >
                  {rosaryDay.mysteries.map((myst, j) => (
                    <header
                      key={`${rosaryDay.setId}-hdr-${j}`}
                      className="flex min-h-0 flex-col items-center px-0.5 text-center"
                    >
                      <p className={`font-semibold uppercase ${ordinalLabelGrid}`} style={{ color: inkSoft }}>
                        {ordinal[j]}
                      </p>
                      <h3
                        className={`mt-[0.2em] max-w-full ${titleGrid}`}
                        style={{ color: PROVENCE.toileBlueDeep }}
                      >
                        {myst.title}
                      </h3>
                    </header>
                  ))}
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-5 gap-[clamp(0.4rem,calc(0.95vmin),0.75rem)] pt-[clamp(0.35rem,calc(0.65vmin),0.55rem)]">
                  {rosaryDay.mysteries.map((myst, j) => (
                    <div
                      key={`${rosaryDay.setId}-card-${j}`}
                      className="flex min-h-0 min-w-0 flex-col"
                    >
                      <RosaryTraditionalCard
                        myst={myst}
                        ink={ink}
                        inkSoft={inkSoft}
                        labelCls={tradCardLabelGrid}
                        bodyCls={tradBodyGrid}
                        citeCls={citeGrid}
                        meditationLabelCls={meditateInCardLabelGrid}
                        meditationBodyCls={meditateInCardBodyGrid}
                        tvGrid
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <article className="flex min-h-0 flex-1 flex-col">
                  <h3 className={`text-center ${titleCarousel}`} style={{ color: PROVENCE.toileBlueDeep }}>
                    {m.title}
                  </h3>
                  <div className="mt-[clamp(0.45rem,calc(0.9vmin+0.32rem),0.65rem)] min-h-0 flex flex-1 flex-col justify-start">
                    <RosaryTraditionalCard
                      myst={m}
                      ink={ink}
                      inkSoft={inkSoft}
                      labelCls={tradLabelCarousel}
                      bodyCls={tradBodyCarousel}
                      citeCls={citeCarousel}
                      meditationLabelCls={meditateInCardLabelCarousel}
                      meditationBodyCls={meditateInCardBodyCarousel}
                    />
                  </div>
                </article>
              </div>
            )}
          </div>

          <div className={`${wideFiveGrid ? "hidden" : "flex shrink-0 flex-wrap items-center justify-center gap-[clamp(0.35rem,1vmin,0.55rem)] border-t px-1 py-[clamp(0.42rem,calc(1vmin+0.35rem),0.65rem)]"}`}
            style={{ borderColor: "rgba(91,58,28,0.15)" }}
            role="group"
            aria-label="Rosary mysteries"
          >
            <button
              type="button"
              aria-label="Previous mystery"
              onClick={() => setIdx((j) => (j <= 0 ? last : j - 1))}
              className={segBtn}
              style={segIdle}
            >
              ←
            </button>
            {rosaryDay.mysteries.map((_, j) => (
              <button
                key={`${rosaryDay.setId}-${j}`}
                type="button"
                aria-current={j === i}
                aria-label={`${ordinal[j]} mystery`}
                onClick={() => setIdx(j)}
                className={`${segBtn} ${j === i ? "text-[#fdf8ee]" : ""}`}
                style={
                  j === i
                    ? { borderColor: PROVENCE.toileBlueDeep, background: PROVENCE.toileBlueDeep, color: PROVENCE.toileCream }
                    : segIdle
                }
              >
                {j + 1}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next mystery"
              onClick={() => setIdx((j) => (j >= last ? 0 : j + 1))}
              className={segBtn}
              style={segIdle}
            >
              →
            </button>
            {!prefersReducedMotion ? (
              <span
                className="w-full shrink-0 basis-full text-center text-[clamp(10px,calc(0.24vmin+0.52rem),11px)] italic min-[482px]:block sm:w-auto sm:basis-auto"
                style={{ color: inkSoft }}
              >
                Rotates automatically for TV · arrows wrap 1 ↔ 5
              </span>
            ) : null}
          </div>
        </div>

        <footer
          className={
            "shrink-0 border-t leading-snug " +
            (wideFiveGrid
              ? "text-[clamp(11px,calc(0.288vmin+0.432rem),13px)]"
              : "text-[clamp(10px,calc(0.24vmin+0.48rem),11px)]") +
            ` ${insetPad}`
          }
          style={{
            borderColor: "rgba(91,58,28,0.2)",
            color: inkSoft,
            background: "rgba(255,250,238,0.55)",
          }}
        >
          <p className="text-balance">
            Sources — Schedule:&nbsp;
            <a href={ROSARY_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: PROVENCE.toileBlueDeep }} onClick={(e) => e.stopPropagation()}>
              {ROSARY_SOURCE.letterLatinTitle}
            </a>
            {` (${ROSARY_SOURCE.sections}). `}
            Quoted excerpts:&nbsp;
            <a
              href="https://archive.org/details/St.LouisMarieDeMontfortTheSecretOfTheRosary"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: PROVENCE.toileBlueDeep }}
              onClick={(e) => e.stopPropagation()}
            >
              Montfort,&nbsp;<i>Secret</i>&nbsp;of&nbsp;the&nbsp;Rosary
            </a>
            ;&nbsp;
            <a
              href={SOURCE_PIUS_XI_INGRAVESCENTIBUS.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: PROVENCE.toileBlueDeep }}
              onClick={(e) => e.stopPropagation()}
            >
              Pius XI,&nbsp;<i>In gravescentibus malis</i>
            </a>
            ; luminous decades:&nbsp;
            <a href="https://www.drbo.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: PROVENCE.toileBlueDeep }} onClick={(e) => e.stopPropagation()}>
              Douay–Rheims Bible (DRBO.org)
            </a>
            . Meditation&nbsp;lines are local.
          </p>
        </footer>
      </div>
    </div>
  );
}
