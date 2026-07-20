import { fontRowMetrics, wrapText } from "@/lib/handwriting/glyph-render";

/** US letter in typographic points (72 pt = 1 in). */
export const PAGE_WIDTH_PT = 612;
export const PAGE_HEIGHT_PT = 792;
export const PAGE_MARGIN_PT = 36;
export const HEADER_HEIGHT_PT = 44;

export const MIN_FONT_PT = 28;
export const MAX_FONT_PT = 72;

export interface WorksheetRow {
  text: string;
  y: number;
  showSolidModel: boolean;
}

export interface WorksheetLayout {
  rows: WorksheetRow[];
  rowHeight: number;
  fontSize: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  baselineOffset: number;
  midlineOffset: number;
  topLineOffset: number;
  descenderLineOffset: number;
  wrappedLineCount: number;
}

export interface BuildWorksheetLayoutInput {
  text: string;
  fontSize: number;
  autoFill: boolean;
  showSolidModel: boolean;
}

interface LayoutDraft {
  rows: WorksheetRow[];
  rowHeight: number;
  fontSize: number;
  contentWidth: number;
  margin: number;
  baselineOffset: number;
  midlineOffset: number;
  topLineOffset: number;
  descenderLineOffset: number;
  wrappedLineCount: number;
  contentEndY: number;
}

function buildLayoutDraft(font: null, input: BuildWorksheetLayoutInput): LayoutDraft {
  const contentWidth = PAGE_WIDTH_PT - PAGE_MARGIN_PT * 2;
  const contentBottom = PAGE_HEIGHT_PT - PAGE_MARGIN_PT;
  const contentTop = PAGE_MARGIN_PT + HEADER_HEIGHT_PT;

  const wrappedLines = wrapText(font, input.text, input.fontSize, contentWidth);
  const metrics = fontRowMetrics(font, input.fontSize);
  const { rowHeight, baselineOffset, midlineOffset, topLineOffset, descenderLineOffset } = metrics;

  const rows: WorksheetRow[] = [];
  let y = contentTop;
  let solidModelPlaced = false;

  const pushRow = (text: string, showSolid: boolean) => {
    rows.push({ text, y, showSolidModel: showSolid });
    y += rowHeight;
  };

  if (wrappedLines.length === 0) {
    return {
      rows: [],
      rowHeight,
      fontSize: input.fontSize,
      contentWidth,
      margin: PAGE_MARGIN_PT,
      baselineOffset,
      midlineOffset,
      topLineOffset,
      descenderLineOffset,
      wrappedLineCount: 0,
      contentEndY: contentTop,
    };
  }

  if (input.autoFill) {
    while (y + rowHeight <= contentBottom) {
      for (let i = 0; i < wrappedLines.length; i++) {
        if (y + rowHeight > contentBottom) break;
        const showSolid = input.showSolidModel && !solidModelPlaced && i === 0;
        if (showSolid) solidModelPlaced = true;
        pushRow(wrappedLines[i], showSolid);
      }
    }
  } else {
    for (let i = 0; i < wrappedLines.length; i++) {
      if (y + rowHeight > contentBottom) break;
      const showSolid = input.showSolidModel && i === 0;
      pushRow(wrappedLines[i], showSolid);
    }
  }

  if (input.autoFill && rows.length > 1) {
    const blockHeight = rows.length * rowHeight;
    const gap = (contentBottom - contentTop - blockHeight) / (rows.length - 1);
    if (gap > 0) {
      for (let i = 0; i < rows.length; i++) {
        rows[i] = { ...rows[i], y: contentTop + i * (rowHeight + gap) };
      }
      y = contentTop + blockHeight + gap * (rows.length - 1);
    }
  }

  return {
    rows,
    rowHeight,
    fontSize: input.fontSize,
    contentWidth,
    margin: PAGE_MARGIN_PT,
    baselineOffset,
    midlineOffset,
    topLineOffset,
    descenderLineOffset,
    wrappedLineCount: wrappedLines.length,
    contentEndY: y,
  };
}

/** Pick the largest font size that still fills the page with minimal bottom slack. */
function fitFontSizeToPage(font: null, input: BuildWorksheetLayoutInput): number {
  const contentBottom = PAGE_HEIGHT_PT - PAGE_MARGIN_PT;
  let bestSize = input.fontSize;
  let bestSlack = Infinity;

  for (let fontSize = MIN_FONT_PT; fontSize <= MAX_FONT_PT; fontSize += 1) {
    const draft = buildLayoutDraft(font, { ...input, fontSize });
    if (draft.rows.length === 0) continue;

    const slack = contentBottom - draft.contentEndY;
    if (slack >= 0 && slack < bestSlack) {
      bestSlack = slack;
      bestSize = fontSize;
    }
  }

  return bestSize;
}

function toWorksheetLayout(draft: LayoutDraft): WorksheetLayout {
  return {
    rows: draft.rows,
    rowHeight: draft.rowHeight,
    fontSize: draft.fontSize,
    contentWidth: draft.contentWidth,
    pageWidth: PAGE_WIDTH_PT,
    pageHeight: PAGE_HEIGHT_PT,
    margin: draft.margin,
    baselineOffset: draft.baselineOffset,
    midlineOffset: draft.midlineOffset,
    topLineOffset: draft.topLineOffset,
    descenderLineOffset: draft.descenderLineOffset,
    wrappedLineCount: draft.wrappedLineCount,
  };
}

export function buildWorksheetLayout(
  font: null,
  input: BuildWorksheetLayoutInput
): WorksheetLayout {
  const effectiveFontSize =
    input.autoFill && input.text.trim()
      ? fitFontSizeToPage(font, input)
      : input.fontSize;

  return toWorksheetLayout(buildLayoutDraft(font, { ...input, fontSize: effectiveFontSize }));
}
