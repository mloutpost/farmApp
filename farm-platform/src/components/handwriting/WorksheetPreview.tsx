"use client";

import { useEffect, useMemo, useState } from "react";
import { renderTextLine } from "@/lib/handwriting/glyph-render";
import type { WorksheetLayout } from "@/lib/handwriting/worksheet-layout";

import { PAGE_HEIGHT_PT } from "@/lib/handwriting/worksheet-layout";

const START_DOT_RADIUS = 2.75;
const START_DOT_FILL = "#2d6a4f";
const RULE_COLOR = "#888888";
const MIDLINE_COLOR = "#aaaaaa";
const DOTTED_STROKE = "2.5 4";
const SOLID_STROKE = 2.2;

interface WorksheetPreviewProps {
  layout: WorksheetLayout | null;
  childName: string;
  showStartDots?: boolean;
  showStrokeOrder?: boolean;
  /** When true, render a full US-letter page (print). When false, crop to content (screen). */
  fillPage?: boolean;
}

function contentHeight(layout: WorksheetLayout): number {
  if (layout.rows.length === 0) return layout.pageHeight;
  const last = layout.rows[layout.rows.length - 1];
  return Math.min(
    PAGE_HEIGHT_PT,
    Math.ceil(last.y + layout.descenderLineOffset + layout.margin)
  );
}

function WorksheetRowSvg({
  row,
  layout,
  showStartDots,
  showStrokeOrder,
}: {
  row: WorksheetLayout["rows"][number];
  layout: WorksheetLayout;
  showStartDots: boolean;
  showStrokeOrder: boolean;
}) {
  const baselineY = row.y + layout.baselineOffset;
  const midlineY = row.y + layout.midlineOffset;
  const topY = row.y + layout.topLineOffset;
  const bottomY = row.y + layout.descenderLineOffset;
  const startX = layout.margin;

  const mode = row.showSolidModel ? "solid" : "dotted";
  const { glyphs } = renderTextLine(null, row.text, layout.fontSize, startX, baselineY, mode);

  return (
    <g>
      <line x1={layout.margin} y1={topY} x2={layout.pageWidth - layout.margin} y2={topY} stroke={RULE_COLOR} strokeWidth={0.75} />
      <line
        x1={layout.margin}
        y1={midlineY}
        x2={layout.pageWidth - layout.margin}
        y2={midlineY}
        stroke={MIDLINE_COLOR}
        strokeWidth={0.5}
        strokeDasharray="6 5"
      />
      <line x1={layout.margin} y1={baselineY} x2={layout.pageWidth - layout.margin} y2={baselineY} stroke={RULE_COLOR} strokeWidth={0.75} />
      <line x1={layout.margin} y1={bottomY} x2={layout.pageWidth - layout.margin} y2={bottomY} stroke={RULE_COLOR} strokeWidth={0.75} />

      {glyphs.map((g, gi) =>
        g.strokes.map((stroke, si) => (
          <g key={`${row.y}-${gi}-${si}-${g.char}`}>
            <path
              d={stroke.d}
              fill="none"
              stroke={mode === "solid" ? "#1a1a1a" : "#555555"}
              strokeWidth={mode === "solid" ? SOLID_STROKE : SOLID_STROKE}
              strokeDasharray={mode === "solid" ? undefined : DOTTED_STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {stroke.startDot && showStartDots ? (
              <circle
                cx={stroke.startDot.cx}
                cy={stroke.startDot.cy}
                r={START_DOT_RADIUS}
                fill={START_DOT_FILL}
              />
            ) : null}
            {stroke.startDot && showStrokeOrder ? (
              <text
                x={stroke.startDot.cx + START_DOT_RADIUS + 0.5}
                y={stroke.startDot.cy - START_DOT_RADIUS - 0.5}
                fontSize={5.5}
                fill="#1a1a1a"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="700"
              >
                {stroke.startDot.order}
              </text>
            ) : null}
          </g>
        ))
      )}
    </g>
  );
}

export default function WorksheetPreview({
  layout,
  childName,
  showStartDots = true,
  showStrokeOrder = false,
  fillPage = true,
}: WorksheetPreviewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const viewHeight = layout ? (fillPage ? layout.pageHeight : contentHeight(layout)) : PAGE_HEIGHT_PT;
  const pageStyle = {
    width: "100%",
    maxWidth: "8.5in",
    aspectRatio: `${layout?.pageWidth ?? 612} / ${viewHeight}`,
  } as const;

  const header = useMemo(() => {
    if (!layout) return null;
    const y = layout.margin + 20;
    const nameLabel = childName.trim() || "Name";
    return (
      <g aria-hidden>
        <text x={layout.margin} y={y} fontSize={11} fill="#333" fontFamily="Georgia, serif">
          Name: {nameLabel}
        </text>
        <text
          x={layout.pageWidth - layout.margin}
          y={y}
          fontSize={11}
          fill="#333"
          fontFamily="Georgia, serif"
          textAnchor="end"
        >
          Date: _______________
        </text>
      </g>
    );
  }, [layout, childName]);

  if (!mounted || !layout) {
    return (
      <div
        className="worksheet-page flex items-center justify-center rounded-sm border bg-white shadow-md"
        style={pageStyle}
      >
        <p className="text-sm text-gray-500">Preparing worksheet…</p>
      </div>
    );
  }

  return (
    <div
      className={`worksheet-page overflow-hidden rounded-sm border border-gray-300 bg-white shadow-md${fillPage ? " worksheet-page--letter" : ""}`}
      style={pageStyle}
    >
      <svg
        viewBox={`0 0 ${layout.pageWidth} ${viewHeight}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMin meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Handwriting tracing worksheet"
      >
        <rect width={layout.pageWidth} height={viewHeight} fill="white" />
        {header}
        {layout.rows.map((row, idx) => (
          <WorksheetRowSvg
            key={`${row.y}-${idx}`}
            row={row}
            layout={layout}
            showStartDots={showStartDots}
            showStrokeOrder={showStrokeOrder}
          />
        ))}
      </svg>
    </div>
  );
}

/** Hershey font is bundled — always ready in the browser. */
export function useHandwritingFont() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { ready, error: null as string | null };
}
