import { charAdvanceUnits, charStrokePaths } from "@/lib/handwriting/hershey-strokes";

export interface RenderedStroke {
  /** SVG path `d` for one pen-down stroke (M…L…). */
  d: string;
  startDot?: { cx: number; cy: number; order: number };
}

export interface RenderedGlyph {
  strokes: RenderedStroke[];
  advanceX: number;
  char: string;
}

const SKIP_START_DOT = new Set([" ", ".", ",", "!", "?", ";", ":", "'", '"', "-"]);

/**
 * Hershey Roman Simplex em box in font units (baseline = 0, y grows down).
 * Measured from Roman Simplex descriptors with baseline at font y=9.
 */
export const HERSHEY_ASCENDER = 21;
export const HERSHEY_DESCENDER = 7;
export const HERSHEY_XHEIGHT = 14;
export const HERSHEY_EM = HERSHEY_ASCENDER + HERSHEY_DESCENDER;

function uniformScale(fontSize: number): number {
  return fontSize / HERSHEY_EM;
}

/** Per-character advance on a shared baseline with uniform scale. */
function glyphAdvance(char: string, fontSize: number): number {
  return charAdvanceUnits(char) * uniformScale(fontSize);
}

export function measureTextWidth(_font: null, text: string, fontSize: number): number {
  let total = 0;
  for (const char of text) {
    total += glyphAdvance(char, fontSize);
  }
  return total;
}

export function wrapText(
  _font: null,
  text: string,
  fontSize: number,
  maxWidth: number
): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    const width = measureTextWidth(null, trial, fontSize);
    if (width <= maxWidth || !current) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderCharStrokes(
  char: string,
  fontSize: number,
  originX: number,
  baselineY: number,
  mode: "dotted" | "solid"
): RenderedGlyph {
  const scale = uniformScale(fontSize);
  const { paths } = charStrokePaths(char || " ");

  const strokes: RenderedStroke[] = [];
  let strokeOrder = 0;

  for (const polyline of paths) {
    if (polyline.length < 2) continue;
    strokeOrder += 1;

    const points = polyline.map(([lx, ly]) => ({
      x: originX + lx * scale,
      // Local y: 0 = baseline; positive = descender below baseline.
      y: baselineY + ly * scale,
    }));

    const d = points
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
      .join(" ");

    let startDot: RenderedStroke["startDot"];
    if (mode === "dotted" && char.trim() && !SKIP_START_DOT.has(char)) {
      startDot = { cx: points[0].x - 2, cy: points[0].y - 2, order: strokeOrder };
    }

    strokes.push({ d, startDot });
  }

  return {
    strokes,
    advanceX: glyphAdvance(char, fontSize),
    char,
  };
}

export function renderTextLine(
  _font: null,
  text: string,
  fontSize: number,
  startX: number,
  baselineY: number,
  mode: "dotted" | "solid"
): { glyphs: RenderedGlyph[]; width: number } {
  const glyphs: RenderedGlyph[] = [];
  let x = startX;

  for (const char of text) {
    const g = renderCharStrokes(char, fontSize, x, baselineY, mode);
    glyphs.push(g);
    x += g.advanceX;
  }

  return { glyphs, width: x - startX };
}

export function fontRowMetrics(_font: null, fontSize: number) {
  const scale = uniformScale(fontSize);
  const ascender = HERSHEY_ASCENDER * scale;
  const descender = HERSHEY_DESCENDER * scale;
  const xHeight = HERSHEY_XHEIGHT * scale;
  const rowPadding = fontSize * 0.06;
  const rowHeight = ascender + descender + rowPadding * 2;
  const baselineOffset = ascender + rowPadding;
  const topLineOffset = rowPadding;
  const midlineOffset = baselineOffset - xHeight;
  const descenderLineOffset = baselineOffset + descender;
  return {
    ascender,
    descender,
    xHeight,
    rowHeight,
    baselineOffset,
    midlineOffset,
    topLineOffset,
    descenderLineOffset,
  };
}

/** Hershey is bundled in JS — no async font fetch. */
export function loadHandwritingFont(): Promise<null> {
  return Promise.resolve(null);
}
