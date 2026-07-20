"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { EB_Garamond } from "next/font/google";
import WorksheetPreview, { useHandwritingFont } from "@/components/handwriting/WorksheetPreview";
import "@/components/handwriting/handwriting-print.css";
import { PROVENCE, PARCHMENT_TEXTURE } from "@/lib/family-dashboard/dashboard-tokens";
import { buildWorksheetLayout } from "@/lib/handwriting/worksheet-layout";

const serif = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-handwriting-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const DEFAULT_TEXT = "the quick brown fox jumped over the lazy dog";
const MIN_FONT = 28;
const MAX_FONT = 72;

const PANEL_BG = "#fdf8ee";
const PANEL_BORDER = "rgba(31, 58, 85, 0.22)";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#1a1510";
const TEXT_MUTED = "#5b3a1c";
const LABEL_COLOR = PROVENCE.toileBlueDeep;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: LABEL_COLOR }}>
      {children}
    </p>
  );
}

function MobileToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors"
      style={{
        borderColor: checked ? "rgba(31,58,85,0.45)" : PANEL_BORDER,
        background: checked ? CARD_BG : "rgba(255,255,255,0.72)",
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: LABEL_COLOR }}>
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug" style={{ color: TEXT_MUTED }}>
          {hint}
        </span>
      </span>
      <span
        aria-hidden
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? PROVENCE.toileBlueDeep : "rgba(91,58,28,0.28)" }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(4px)" }}
        />
      </span>
    </button>
  );
}

function TextFieldCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-sm border px-3 py-3"
      style={{ borderColor: PANEL_BORDER, background: CARD_BG }}
    >
      <label className="block">
        <span className="text-sm font-semibold" style={{ color: LABEL_COLOR }}>
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-snug" style={{ color: TEXT_MUTED }}>
            {hint}
          </span>
        ) : null}
        <div className="mt-2.5">{children}</div>
      </label>
    </div>
  );
}

function SliderCard({
  label,
  value,
  min,
  max,
  step,
  onChange,
  footer,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-sm border px-3 py-3"
      style={{ borderColor: PANEL_BORDER, background: CARD_BG }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: LABEL_COLOR }}>
          {label}
        </span>
        <span className="text-sm tabular-nums font-semibold" style={{ color: TEXT_PRIMARY }}>
          {value} pt
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-8 w-full touch-manipulation accent-[#1f3a55]"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

const fieldClassName =
  "w-full rounded-sm border px-3 py-2.5 text-base leading-relaxed text-[#1a1510] placeholder:text-[#8a6f43] focus:outline-none focus:ring-2 focus:ring-[#1f3a55]/30";

export default function HandwritingWorksheetApp() {
  const { ready, error: fontError } = useHandwritingFont();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [fontSize, setFontSize] = useState(44);
  const [autoFill, setAutoFill] = useState(true);
  const [showSolidModel, setShowSolidModel] = useState(true);
  const [showStartDots, setShowStartDots] = useState(true);
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [childName, setChildName] = useState("");

  const layout = useMemo(() => {
    if (!ready) return null;
    return buildWorksheetLayout(null, {
      text,
      fontSize,
      autoFill,
      showSolidModel,
    });
  }, [ready, text, fontSize, autoFill, showSolidModel]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const rowCount = layout?.rows.length ?? 0;

  return (
    <div
      className={`min-h-screen w-full ${serif.variable}`}
      style={{
        fontFamily: "var(--font-handwriting-serif), Georgia, serif",
        background: PROVENCE.woodShadow,
        color: TEXT_PRIMARY,
      }}
    >
      <div className="no-print mx-auto max-w-lg px-4 py-6 sm:max-w-2xl sm:px-6 sm:py-8">
        <section
          className="space-y-5 rounded-sm border p-4 sm:p-5"
          style={{
            borderColor: PANEL_BORDER,
            background: PANEL_BG,
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
          }}
        >
          <header className="border-b pb-4" style={{ borderColor: PANEL_BORDER }}>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: PROVENCE.toileBlue }}>
              Homeschool
            </p>
            <h1
              className="mt-2 text-2xl font-semibold italic sm:text-3xl"
              style={{ color: LABEL_COLOR }}
            >
              Handwriting worksheets
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              Type copywork text, preview dotted tracing lines, and print a full letter-size page.
            </p>
            <Link
              href="/family-dashboard"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold uppercase tracking-[0.18em] underline underline-offset-4 hover:opacity-80"
              style={{ color: PROVENCE.toileBlue }}
            >
              ← TV board
            </Link>
          </header>

          <div className="space-y-3">
            <TextFieldCard label="Practice text" hint="Sentence or phrase to trace">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className={fieldClassName}
                style={{ borderColor: PANEL_BORDER, minHeight: "5.5rem" }}
                placeholder={DEFAULT_TEXT}
              />
            </TextFieldCard>

            <TextFieldCard label="Child name" hint="Optional — prints on the worksheet header">
              <input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className={fieldClassName}
                style={{ borderColor: PANEL_BORDER, minHeight: "2.75rem" }}
                placeholder="Emma"
              />
            </TextFieldCard>

            <SliderCard
              label="Letter size"
              value={fontSize}
              min={MIN_FONT}
              max={MAX_FONT}
              step={2}
              onChange={setFontSize}
              footer={
                <p className="text-xs tabular-nums" style={{ color: TEXT_MUTED }}>
                  {rowCount} row{rowCount === 1 ? "" : "s"} on page
                </p>
              }
            />
          </div>

          <div className="space-y-2">
            <SectionHeading>Page layout</SectionHeading>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MobileToggle
                label="Fill page"
                hint="Repeat lines until the page is full"
                checked={autoFill}
                onChange={setAutoFill}
              />
              <MobileToggle
                label="Solid model row"
                hint="First row in solid ink as a guide"
                checked={showSolidModel}
                onChange={setShowSolidModel}
              />
            </div>
          </div>

          <div className="space-y-2">
            <SectionHeading>Tracing guides</SectionHeading>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MobileToggle
                label="Start dots"
                hint="Green markers at each stroke start"
                checked={showStartDots}
                onChange={setShowStartDots}
              />
              <MobileToggle
                label="Stroke order"
                hint="Number each stroke 1, 2, 3… per letter"
                checked={showStrokeOrder}
                onChange={setShowStrokeOrder}
              />
            </div>
          </div>

          {fontError ? (
            <p className="text-sm" style={{ color: PROVENCE.toileRed }}>
              {fontError}
            </p>
          ) : null}

          <p className="text-xs leading-snug" style={{ color: TEXT_MUTED }}>
            Print tip: enable <strong className="font-semibold">Background graphics</strong> in your
            print dialog so guide lines appear.
          </p>
        </section>
      </div>

      <div
        className="worksheet-print-root px-4 pb-28 sm:px-6 sm:pb-8"
        style={{
          backgroundImage: PARCHMENT_TEXTURE,
          backgroundColor: PROVENCE.toileCream,
        }}
      >
        <div className="mx-auto flex max-w-lg justify-center sm:max-w-2xl">
          <WorksheetPreview
            layout={layout}
            childName={childName}
            showStartDots={showStartDots}
            showStrokeOrder={showStrokeOrder}
          />
        </div>
      </div>

      <div
        className="no-print fixed inset-x-0 bottom-0 z-[10000] border-t px-4 py-3"
        style={{
          borderColor: PANEL_BORDER,
          background: "rgba(253,248,238,0.98)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <div className="mx-auto flex max-w-lg gap-3 sm:max-w-2xl">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!layout || layout.rows.length === 0 || !ready}
            className="min-h-[48px] flex-1 rounded-sm border px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-40"
            style={{
              borderColor: PROVENCE.toileBlueDeep,
              background: PROVENCE.toileBlueDeep,
              color: PROVENCE.toileCream,
            }}
          >
            Print worksheet
          </button>
        </div>
      </div>
    </div>
  );
}
