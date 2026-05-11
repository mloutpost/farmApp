/**
 * Parser for the Liturgical Year Project's daily email.
 *
 * The email is markdown-flavored plain text and on most days carries
 * SEVERAL entries — typically the day's Sunday/feria followed by one
 * or more saints commemorated on that date. Each entry begins with an
 * ALL-CAPS title wrapped in single asterisks (the parser uses this as
 * the entry boundary), e.g.:
 *
 *   *THE FIFTH SUNDAY AFTER EASTER* ( https://… )
 *   *MAY 10: ST. ANTONINUS, BISHOP AND CONFESSOR* ( https://… )
 *   *MAY 10 (THE SAME DAY): STS. GORDIAN AND EPIMACHUS, MARTYRS* ( … )
 *
 * Inside each entry the body is markdown:
 *
 *   *MASS*
 *   ------
 *
 *   *Collect*
 *
 *   >
 *   > Deus, a quo bona cuncta procedunt …
 *
 *   >
 *   > O God, from whom all that is good proceeds …
 *
 * `*Header*` lines (mixed case) open sub-sections, `>`-prefixed lines
 * are blockquote bodies, and Latin/English are split into two
 * separate consecutive blockquotes. Free prose between the entry
 * title and the first sub-section is the reflection.
 *
 * The parser emits both:
 *   - `entries[]` — every detected entry, in document order, so the
 *     wizard can let the user pick which one to surface on the TV.
 *   - top-level fields (`title`, `feast`, `reflection`, `collect`,
 *     `readings`, …) mirroring `entries[0]`, so existing callers that
 *     ignore the new array continue to work.
 */

export interface ParsedEntry {
  /** Raw entry header (ALL CAPS) — e.g. "THE FIFTH SUNDAY AFTER EASTER". */
  title: string;
  /** Same as `title` for now; kept distinct so future versions can
   *  normalize ("THE FIFTH SUNDAY AFTER EASTER" → "Fifth Sunday after
   *  Easter") without breaking callers that consume `title` raw. */
  feast: string;
  /** Free-form reflection prose, joined by blank lines. */
  reflection?: string;
  /** Latin variant if the reflection paired Latin/English paragraphs
   *  (rare; usually only on saint-day entries). */
  reflectionLatin?: string;
  /** Mass collect (the main one — commemorative collects like *Of
   *  the Blessed Virgin* / *For the Pope* are deliberately skipped). */
  collect?: string;
  collectLatin?: string;
  /** Combined Mass readings (Epistle + Gospel) English text. */
  readings?: string;
  readingsLatin?: string;
  /** True if a *MASS* divider was found (Sunday/feria entries).
   *  False for saint-of-the-day entries that only carry a biography. */
  hasMass: boolean;
}

export interface ParsedLiturgicalEmail {
  /** Liturgical season ("Paschaltide", "Lent", …) when the email's
   *  intro mentions it; empty otherwise. */
  season?: string;
  /** Every entry detected in document order. The wizard can let the
   *  user pick one; the dashboard renders one at a time. */
  entries: ParsedEntry[];

  // --- Backward-compat top-level fields (mirror entries[0]) ---
  title?: string;
  feast?: string;
  reflection?: string;
  reflectionLatin?: string;
  collect?: string;
  collectLatin?: string;
  readings?: string;
  readingsLatin?: string;
}

/* ---------- HTML → text fallback ---------- */

const BLOCK_TAGS = [
  "p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "section", "article", "blockquote", "tr",
];

export function stripHtml(html: string): string {
  let out = html;
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  for (const tag of BLOCK_TAGS) {
    out = out.replace(new RegExp(`<\\s*${tag}[^>]*>`, "gi"), "\n");
    out = out.replace(new RegExp(`<\\s*/\\s*${tag}\\s*>`, "gi"), "\n");
  }
  out = out.replace(/<[^>]+>/g, "");
  out = out
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)));
  return out
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- Header detection ---------- */

/** Trailing ` ( https://… )` link the LYP newsletter appends to entry
 *  headers. */
const TRAILING_LINK_RE = /\s*\(\s*https?:\/\/[^)]+\)\s*$/;

/** Strip trailing ` ( https://… )` appended to ALL-CAPS entry headers. */
export function stripLiturgicalTrailingLink(headline: string): string {
  return headline.trim().replace(TRAILING_LINK_RE, "").trim();
}

/**
 * Headlines for same-day commemorations following the principal Sunday Mass
 * entry. Only applies when entry `0` is the chosen primary (`primaryEntryIndex
 * === 0`), has Mass, and its title mentions Sunday; subsequent entries without
 * Mass get listed (stripped headlines).
 */
export function sundayCommemorationHeadlines(
  parsed: ParsedLiturgicalEmail,
  primaryEntryIndex: number
): string[] {
  const entries = parsed.entries ?? [];
  if (entries.length < 2 || primaryEntryIndex !== 0) return [];
  const primary = entries[0];
  if (!primary?.hasMass) return [];
  const label = (primary.title ?? primary.feast ?? "").toUpperCase();
  if (!/\bSUNDAY\b/.test(label)) return [];
  const out: string[] = [];
  for (let i = 1; i < entries.length; i++) {
    const head = entries[i]?.title ?? entries[i]?.feast;
    if (!head) continue;
    out.push(stripLiturgicalTrailingLink(head));
  }
  return out;
}

/** An entry begins with `*ALL-CAPS TITLE*` on its own line, optionally
 *  followed by a URL in parens. We require ≥3 ALL-CAPS letters so a
 *  short bold word like `*MASS*` doesn't get mistaken for an entry. */
function entryTitleFromLine(line: string): string | null {
  const trimmed = line.trim().replace(TRAILING_LINK_RE, "").trim();
  const m = trimmed.match(/^\*\s*([^*\n]+?)\s*\*$/);
  if (!m) return null;
  const inner = m[1].trim();
  // Must be predominantly ALL CAPS (the saints headers contain digits
  // and parens too: "MAY 10 (THE SAME DAY): STS. GORDIAN…"). Accept
  // any letter, digit, space, or common punctuation; reject if any
  // ASCII lowercase letter sneaks in.
  if (/[a-z]/.test(inner)) return null;
  if (!/[A-Z]/.test(inner)) return null;
  if (inner.length < 6) return null;
  return inner;
}

/** Mass / Vespers dividers — case-sensitive ALL-CAPS short words. */
function isMassDivider(line: string): boolean {
  const trimmed = line.trim().replace(/^\*+|\*+$/g, "").trim();
  return /^MASS$/i.test(trimmed) || /^VESPERS$/i.test(trimmed);
}

/** Any other `*Mixed Case*` markdown heading inside an entry. */
function subsectionHeaderFromLine(line: string): string | null {
  const trimmed = line.trim();
  // Reject the bare divider lines (`------`).
  if (/^[-=_]{3,}$/.test(trimmed)) return null;
  const m = trimmed.match(/^\*\s*([^*\n]+?)\s*\*$/);
  if (!m) return null;
  const inner = m[1].trim();
  if (inner.length === 0) return null;
  // Don't treat ALL-CAPS lines as subsection headers — they're either
  // entry titles or MASS/VESPERS dividers, both handled above.
  if (!/[a-z]/.test(inner)) return null;
  if (inner.length > 80) return null;
  return inner.toLowerCase();
}

/* ---------- Footer / noise stripping ---------- */

/** Hard cutoff lines: everything below is dropped before parsing. */
function isHardFooter(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^This email message is part of the Liturgical Year Project/i.test(t) ||
    /\bunsubscribe\b/i.test(t) ||
    /^©\s*20\d{2}/.test(t)
  );
}

/** Per-paragraph noise filter applied after sectioning. */
function isNoiseParagraph(p: string): boolean {
  const t = p.trim();
  if (!t) return true;
  return (
    /^From Dom Guéranger['’]s The Liturgical Year\.?$/i.test(t) ||
    /^From\s+stlawrence\.cc/i.test(t) ||
    /^Visit\s+livemass\.net/i.test(t) ||
    /icons made by\s+freepik/i.test(t) ||
    /report typos?/i.test(t) ||
    /\bbrevo\.net\b/i.test(t) ||
    /\bsendinblue\.com\b/i.test(t) ||
    /^_{3,}\s*$/.test(t) ||
    /^-{3,}\s*$/.test(t) ||
    // Footnote lines: "[1] St. John, xvi. 16."
    /^\[\d+\]\s/.test(t)
  );
}

/* ---------- Blockquote / paragraph helpers ---------- */

function stripBlockquote(line: string): string {
  return line.replace(/^>[ \t]?/, "");
}

/** True for footnote lines like `[1] St. John, xvi. 16.` — these
 *  appear at the bottom of each entry and would otherwise leak into
 *  the trailing sub-section's parsed text. */
function isFootnoteLine(line: string): boolean {
  return /^\s*\[\d+\]\s+\S/.test(line);
}

/**
 * Group a section's raw lines into paragraphs. Strips `> ` prefixes,
 * collapses soft-wrapped lines, and treats blank lines (or `>`-only
 * lines) as paragraph breaks. Footnote lines are dropped entirely.
 */
function paragraphsFromLines(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (!buffer.length) return;
    const joined = buffer
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (joined) paragraphs.push(joined);
    buffer = [];
  };
  for (const raw of lines) {
    if (isFootnoteLine(raw)) {
      flush();
      continue;
    }
    const stripped = stripBlockquote(raw);
    if (stripped.trim() === "") {
      flush();
      continue;
    }
    buffer.push(stripped);
  }
  flush();
  return paragraphs;
}

function tidyParagraph(p: string): string {
  return p
    .replace(/^\s*\*+\s*/, "")
    .replace(/\s*\*+\s*$/, "")
    // Strip inline footnote markers like "Saviour.[1] But"
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- Latin / English split ---------- */

function latinScore(text: string): number {
  let score = 0;
  if (/[æœÆŒ]/.test(text)) score += 3;
  if (/\bquae\b/i.test(text)) score += 1;
  if (/\bDominum\b|\bDominus\b|\bDeus\b|\bDei\b/i.test(text)) score += 2;
  if (/\bPer\s+Christum\b|\bPer\s+Dominum\b/i.test(text)) score += 4;
  if (/\bPater\b|\bSpiritus\b|\bSanctus\b|\bSancta\b|\bGloria\b/i.test(text)) score += 1;
  if (/\b\w+(?:amus|emus|imus|antur|entur|untur|abunt|ebunt|ibunt)\b/i.test(text)) score += 1;

  const englishStopwords = [
    "the", "and", "from", "who", "whose", "that", "with", "they",
    "have", "your", "this", "thy", "may", "we", "our", "let", "for",
    "but",
  ];
  let englishHits = 0;
  for (const sw of englishStopwords) {
    const matches = text.match(new RegExp(`\\b${sw}\\b`, "gi"));
    if (matches) englishHits += matches.length;
  }
  if (englishHits === 0) score += 2;
  return score - englishHits;
}

function isLatinParagraph(text: string): boolean {
  return latinScore(text) > 1;
}

interface SplitResult {
  english: string[];
  latin: string[];
}

/** Split a section's paragraphs into Latin and English groups. */
function splitLatinEnglish(paragraphs: string[]): SplitResult {
  if (paragraphs.length === 0) return { english: [], latin: [] };
  const flags = paragraphs.map(isLatinParagraph);
  const hasLatin = flags.some((f) => f);
  const hasEnglish = flags.some((f) => !f);
  if (!hasLatin || !hasEnglish) {
    // All-one-language section — keep it as English so the user sees
    // it in the primary slot (we never silently drop content).
    return { english: paragraphs, latin: [] };
  }
  const english: string[] = [];
  const latin: string[] = [];
  paragraphs.forEach((p, i) => (flags[i] ? latin : english).push(p));
  return { english, latin };
}

/* ---------- Entry-level parsing ---------- */

interface RawEntry {
  title: string;
  /** Lines belonging to this entry, BEFORE any sub-section
   *  classification. */
  bodyLines: string[];
}

/** Walk the (post-hard-footer-cut) lines and split them into entries
 *  by `*ALL-CAPS*` boundaries. Lines before the first entry are kept
 *  in `preface` for season detection. */
function splitIntoEntries(lines: string[]): { preface: string[]; entries: RawEntry[] } {
  const entries: RawEntry[] = [];
  const preface: string[] = [];
  let current: RawEntry | null = null;
  for (const line of lines) {
    const titleCandidate = entryTitleFromLine(line);
    if (titleCandidate && !isMassDivider(line)) {
      if (current) entries.push(current);
      current = { title: titleCandidate, bodyLines: [] };
      continue;
    }
    if (current) {
      current.bodyLines.push(line);
    } else {
      preface.push(line);
    }
  }
  if (current) entries.push(current);
  return { preface, entries };
}

interface SubsectionBlock {
  /** Lowercased, e.g. "collect", "of the blessed virgin". */
  header: string;
  lines: string[];
}

/** Walk one entry's body lines and produce:
 *   - `reflectionLines` — everything before the first MASS divider
 *     and outside any *Header* block.
 *   - `subsections` — the *Header* blocks in document order. */
function partitionEntryBody(lines: string[]): {
  reflectionLines: string[];
  subsections: SubsectionBlock[];
  hasMass: boolean;
} {
  const reflectionLines: string[] = [];
  const subsections: SubsectionBlock[] = [];

  let inMass = false;
  let hasMass = false;
  let current: SubsectionBlock | null = null;
  let inAfterMassProse = false;

  const flush = () => {
    if (current && current.lines.length) {
      subsections.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    if (isMassDivider(line)) {
      flush();
      inMass = true;
      hasMass = true;
      inAfterMassProse = true;
      continue;
    }
    const subHeader = subsectionHeaderFromLine(line);
    if (subHeader) {
      flush();
      current = { header: subHeader, lines: [] };
      inAfterMassProse = false;
      continue;
    }
    // Ignore the `------` rule lines that follow MASS / VESPERS.
    if (/^[-=_]{3,}\s*$/.test(line.trim())) continue;

    if (current) {
      current.lines.push(line);
      continue;
    }
    if (inMass) {
      // After the *MASS* divider but before any *Header* block, the
      // newsletter has prose like "The Introit is taken from Isaias…"
      // — that's editorial commentary, not the reflection. Drop it.
      if (inAfterMassProse) continue;
      continue;
    }
    reflectionLines.push(line);
  }
  flush();

  return { reflectionLines, subsections, hasMass };
}

/** Convert subsection blocks into a primary/latin pair, applying the
 *  Latin/English split. */
function renderSubsection(block: SubsectionBlock): { english?: string; latin?: string } {
  const paras = paragraphsFromLines(block.lines)
    .map(tidyParagraph)
    .filter((p) => p && !isNoiseParagraph(p));
  if (!paras.length) return {};
  const split = splitLatinEnglish(paras);
  return {
    english: split.english.length ? split.english.join("\n\n") : undefined,
    latin: split.latin.length ? split.latin.join("\n\n") : undefined,
  };
}

/** Build the structured entry from its raw lines. */
function buildEntry(raw: RawEntry): ParsedEntry {
  const { reflectionLines, subsections, hasMass } = partitionEntryBody(raw.bodyLines);

  // Reflection: free prose between the entry title and the first
  // sub-section / MASS divider, plus any non-Latin biographical prose
  // for saint-day entries (which intersperse `*Header*`-less prose
  // around their Latin/English biography blockquote).
  const reflectionParas = paragraphsFromLines(reflectionLines)
    .map(tidyParagraph)
    .filter((p) => p && !isNoiseParagraph(p));

  // Saint-day entries wrap the biography in `>`-prefixed paragraphs
  // without a `*Header*`. partitionEntryBody put them into
  // reflectionLines; splitLatinEnglish then separates the Latin from
  // the surrounding English commentary cleanly.
  const reflectionSplit = splitLatinEnglish(reflectionParas);

  // Find the first *Collect* block (skip commemorative collects like
  // *Of the Blessed Virgin* / *For the Pope*).
  const collectBlock = subsections.find((s) => /^collects?$/.test(s.header));
  const collect = collectBlock ? renderSubsection(collectBlock) : {};

  // Mass readings: combine *Epistle* + *Gospel* (and *Lesson* /
  // *Sequel of the Gospel* which sometimes appear inline).
  const readingBlocks = subsections.filter((s) =>
    /^(epistle|epistle\s*&\s*gospel|gospel|lesson|lectio|reading|readings|alleluia|gradual)$/i.test(
      s.header
    )
  );
  const readingsRendered = readingBlocks
    .map(renderSubsection)
    .filter((r) => r.english || r.latin);
  const readingsEnglish = readingsRendered
    .map((r) => r.english)
    .filter((s): s is string => !!s)
    .join("\n\n");
  const readingsLatin = readingsRendered
    .map((r) => r.latin)
    .filter((s): s is string => !!s)
    .join("\n\n");

  return {
    title: raw.title,
    feast: raw.title,
    reflection: reflectionSplit.english.length
      ? reflectionSplit.english.join("\n\n")
      : undefined,
    reflectionLatin: reflectionSplit.latin.length
      ? reflectionSplit.latin.join("\n\n")
      : undefined,
    collect: collect.english,
    collectLatin: collect.latin,
    readings: readingsEnglish || undefined,
    readingsLatin: readingsLatin || undefined,
    hasMass,
  };
}

/* ---------- Season detection ---------- */

const SEASON_NAMES = [
  "Advent",
  "Christmastide",
  "Christmas",
  "Septuagesima",
  "Lent",
  "Passiontide",
  "Holy Week",
  "Eastertide",
  "Paschaltide",
  "Pentecost",
  "Time after Pentecost",
  "Time after Epiphany",
  "Ember",
];

function detectSeason(prefaceLines: string[]): string | undefined {
  const text = prefaceLines.join("\n");
  // Look for "Introduction to the Season of <Name>" first (canonical).
  const intro = text.match(
    /Introduction to (?:the\s+)?Season of\s+([A-Z][A-Za-z][A-Za-z ]+?)(?=[\s.\n*])/i
  );
  if (intro) {
    const candidate = intro[1].trim();
    return SEASON_NAMES.find((s) => s.toLowerCase() === candidate.toLowerCase()) ?? candidate;
  }
  for (const name of SEASON_NAMES) {
    const re = new RegExp(`\\bSeason of\\s+${name}\\b`, "i");
    if (re.test(text)) return name;
  }
  return undefined;
}

/* ---------- Public entry point ---------- */

export function parseLiturgicalEmail(input: string): ParsedLiturgicalEmail {
  if (!input?.trim()) return { entries: [] };

  const looksHtml = /<\/?[a-z][\s\S]*?>/i.test(input);
  const text = looksHtml ? stripHtml(input) : input;
  const allLines = text.replace(/\r/g, "").split("\n");

  // Hard-cut the trailing footer en bloc.
  let cut = allLines.length;
  for (let i = 0; i < allLines.length; i++) {
    if (isHardFooter(allLines[i])) {
      cut = i;
      break;
    }
  }
  const lines = allLines.slice(0, cut);

  const { preface, entries: rawEntries } = splitIntoEntries(lines);
  const season = detectSeason(preface);

  // Fallback: if we found no entries (legacy single-entry email
  // format), treat the whole text as one nameless entry.
  const rawEntriesEffective: RawEntry[] = rawEntries.length
    ? rawEntries
    : [{ title: "", bodyLines: lines }];

  const entries = rawEntriesEffective
    .map(buildEntry)
    // Drop empty entries that produced no content at all.
    .filter((e) => e.reflection || e.collect || e.readings || e.title);

  const trunc = (s: string | undefined, n: number) =>
    s && s.length > n ? s.slice(0, n) : s;

  const truncated: ParsedEntry[] = entries.map((e) => ({
    title: trunc(e.title, 200) ?? "",
    feast: trunc(e.feast, 200) ?? "",
    reflection: trunc(e.reflection, 6000),
    reflectionLatin: trunc(e.reflectionLatin, 6000),
    collect: trunc(e.collect, 2000),
    collectLatin: trunc(e.collectLatin, 2000),
    readings: trunc(e.readings, 4000),
    readingsLatin: trunc(e.readingsLatin, 4000),
    hasMass: e.hasMass,
  }));

  const primary = truncated[0];

  return {
    season,
    entries: truncated,
    title: primary?.title || undefined,
    feast: primary?.feast || undefined,
    reflection: primary?.reflection,
    reflectionLatin: primary?.reflectionLatin,
    collect: primary?.collect,
    collectLatin: primary?.collectLatin,
    readings: primary?.readings,
    readingsLatin: primary?.readingsLatin,
  };
}
