import { fontRowMetrics, wrapText } from "@/lib/handwriting/glyph-render";

/** US letter in typographic points (72 pt = 1 in). */
export const PAGE_WIDTH_PT = 612;
export const PAGE_HEIGHT_PT = 792;
export const PAGE_MARGIN_PT = 36;
export const HEADER_HEIGHT_PT = 44;

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

export function buildWorksheetLayout(
  font: null,
  input: BuildWorksheetLayoutInput
): WorksheetLayout {
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
      pageWidth: PAGE_WIDTH_PT,
      pageHeight: PAGE_HEIGHT_PT,
      margin: PAGE_MARGIN_PT,
      baselineOffset,
      midlineOffset,
      topLineOffset,
      descenderLineOffset,
      wrappedLineCount: 0,
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

  return {
    rows,
    rowHeight,
    fontSize: input.fontSize,
    contentWidth,
    pageWidth: PAGE_WIDTH_PT,
    pageHeight: PAGE_HEIGHT_PT,
    margin: PAGE_MARGIN_PT,
    baselineOffset,
    midlineOffset,
    topLineOffset,
    descenderLineOffset,
    wrappedLineCount: wrappedLines.length,
  };
}
