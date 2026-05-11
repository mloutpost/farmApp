/**
 * Thin browser-side wrapper around the Gmail REST API for the Liturgical
 * Year wizard. The dashboard is a static export, so this code runs in
 * the browser and authenticates with a GIS-minted access token (see
 * `google-token.ts`'s `requestGoogleGmailAccessToken`).
 *
 * Surface kept tiny — only what the connect-gmail wizard needs:
 *   - getProfile(token)            -> { emailAddress, messagesTotal }
 *   - searchMessages(token, q)     -> [{ id, threadId }]
 *   - getMessage(token, id)        -> full message JSON
 *   - listLabels(token)            -> labels
 *   - extractPlainTextBody(message)
 *   - parseFromHeader(headerValue)
 */

const GMAIL_BASE_URL = "https://www.googleapis.com/gmail/v1/users/me";

export interface GmailProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type?: "system" | "user";
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  historyId?: string;
}

export interface GmailFetchOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  baseUrl?: string;
}

interface GmailErrorBody {
  error?: { message?: string; status?: string; code?: number };
}

/**
 * Custom error so the wizard can show actionable hints when the user
 * needs to add the Gmail scope to their OAuth consent screen, etc.
 */
export class GmailApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function gmailFetch<T>(
  path: string,
  token: string,
  opts: GmailFetchOptions = {},
  init: RequestInit = {}
): Promise<T> {
  const baseUrl = opts.baseUrl ?? GMAIL_BASE_URL;
  const fetchFn = opts.fetchImpl ?? fetch;
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetchFn(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    signal: opts.signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as GmailErrorBody;
      detail = body.error?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new GmailApiError(
      `Gmail request failed (${res.status})${detail ? `: ${detail}` : ""}`,
      res.status,
      detail
    );
  }
  return (await res.json()) as T;
}

export async function getProfile(
  token: string,
  opts: GmailFetchOptions = {}
): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>("/profile", token, opts);
}

export interface SearchMessagesResult {
  messages: GmailMessageRef[];
  resultSizeEstimate: number;
  nextPageToken?: string;
}

interface RawSearchResponse {
  messages?: GmailMessageRef[];
  resultSizeEstimate?: number;
  nextPageToken?: string;
}

export async function searchMessages(
  token: string,
  q: string,
  max = 25,
  opts: GmailFetchOptions = {}
): Promise<SearchMessagesResult> {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("maxResults", String(Math.max(1, Math.min(500, max))));
  const json = await gmailFetch<RawSearchResponse>(
    `/messages?${params.toString()}`,
    token,
    opts
  );
  return {
    messages: json.messages ?? [],
    resultSizeEstimate: json.resultSizeEstimate ?? 0,
    nextPageToken: json.nextPageToken,
  };
}

export type GmailMessageFormat = "full" | "metadata" | "minimal" | "raw";

export async function getMessage(
  token: string,
  id: string,
  format: GmailMessageFormat = "full",
  opts: GmailFetchOptions = {}
): Promise<GmailMessage> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (format === "metadata") {
    params.append("metadataHeaders", "From");
    params.append("metadataHeaders", "Subject");
    params.append("metadataHeaders", "Date");
  }
  return gmailFetch<GmailMessage>(
    `/messages/${encodeURIComponent(id)}?${params.toString()}`,
    token,
    opts
  );
}

interface RawLabelsResponse {
  labels?: GmailLabel[];
}

export async function listLabels(
  token: string,
  opts: GmailFetchOptions = {}
): Promise<GmailLabel[]> {
  const json = await gmailFetch<RawLabelsResponse>("/labels", token, opts);
  return json.labels ?? [];
}

/* ---------- Helpers (no network) ---------- */

/**
 * Decode Gmail's base64url body data to a UTF-8 string.
 *
 * `atob` and `TextDecoder` are both available in browsers and modern Node
 * (>= 18), so this implementation works in both the wizard and the CLI
 * import script without pulling in a Node-only dependency.
 */
export function decodeBase64UrlToText(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Walk a Gmail message MIME tree and return the plain-text body.
 * Prefers `text/plain` parts; falls back to stripping HTML from
 * `text/html` if no plain part exists. Empty string when no body.
 *
 * The returned text is left as the email senders wrote it — the
 * downstream `parseLiturgicalEmail` does the section detection.
 */
export function extractPlainTextBody(message: GmailMessage): string {
  const payload = message.payload;
  if (!payload) return "";

  let plain: string | null = null;
  let html: string | null = null;

  const visit = (part: GmailMessagePart) => {
    const mime = (part.mimeType ?? "").toLowerCase();
    const data = part.body?.data;
    if (data) {
      if (mime === "text/plain" && plain == null) {
        plain = decodeBase64UrlToText(data);
      } else if (mime === "text/html" && html == null) {
        html = decodeBase64UrlToText(data);
      }
    }
    if (part.parts) {
      for (const child of part.parts) visit(child);
    }
  };
  visit(payload);

  if (plain) return plain;
  if (html) return stripHtmlToText(html);
  // Single-part raw message with no nested parts: try the snippet as a
  // last resort so the wizard can still show *something*.
  return message.snippet ?? "";
}

/**
 * Minimal HTML → text. Intentionally simpler than the parser's
 * `stripHtml` because the wizard preview just needs readable text;
 * the downstream parser will do its own pass.
 */
function stripHtmlToText(html: string): string {
  let out = html;
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<\s*br\s*\/?>/gi, "\n");
  out = out.replace(/<\s*\/p\s*>/gi, "\n\n");
  out = out.replace(/<\s*\/(div|h[1-6]|li|tr|section|article|blockquote)\s*>/gi, "\n");
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
  return out.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Read a single named header out of a Gmail payload, case-insensitive. */
export function getHeader(message: GmailMessage, name: string): string | undefined {
  const headers = message.payload?.headers;
  if (!headers) return undefined;
  const lc = name.toLowerCase();
  for (const h of headers) {
    if (h.name.toLowerCase() === lc) return h.value;
  }
  return undefined;
}

/**
 * Parse an RFC 5322 `From:` header into name + email.
 *
 * Accepts:
 *   "Dom Guéranger <hello@example.com>"
 *   "<hello@example.com>"
 *   "hello@example.com"
 *   '"Dom, Guéranger" <hello@example.com>'
 *   "Dom Guéranger hello@example.com"
 */
export function parseFromHeader(headerValue: string): { name?: string; email?: string } {
  const v = headerValue.trim();
  if (!v) return {};
  const angle = v.match(/^(.*?)<\s*([^>\s]+)\s*>\s*$/);
  if (angle) {
    const name = angle[1].trim().replace(/^"(.*)"$/, "$1").trim();
    return { name: name || undefined, email: angle[2].toLowerCase() };
  }
  const emailOnly = v.match(/^[^\s<>"]+@[^\s<>"]+$/);
  if (emailOnly) return { email: v.toLowerCase() };
  // Try to find an embedded address
  const inline = v.match(/([^\s<>"]+@[^\s<>"]+)/);
  if (inline) {
    const email = inline[1].toLowerCase();
    const namePart = v.replace(inline[1], "").trim().replace(/^["<]+|[">]+$/g, "").trim();
    return { name: namePart || undefined, email };
  }
  return { name: v };
}

/* ---------- Sender candidate aggregation ---------- */

export interface SenderCandidate {
  /** The lowercase email address used as the bucket key. */
  email: string;
  /** Display name (falls back to the email if no name was found). */
  name: string;
  /** Original raw `From:` header value of the most recent matching message. */
  rawFromHeader: string;
  count: number;
  /** Up to `maxSubjects` recent subject lines from this sender. */
  subjects: string[];
  /** Most-recent `internalDate` (epoch ms) seen for this sender. */
  lastInternalDate: number;
}

/**
 * Given a list of metadata-format messages, group them by `From:`
 * address and return the senders sorted by recency / volume so the
 * wizard can present the best candidates first.
 */
export function summarizeSenders(
  messages: GmailMessage[],
  maxSubjects = 3
): SenderCandidate[] {
  const buckets = new Map<string, SenderCandidate>();
  for (const m of messages) {
    const fromRaw = getHeader(m, "From");
    if (!fromRaw) continue;
    const { name, email } = parseFromHeader(fromRaw);
    const key = (email ?? fromRaw).toLowerCase();
    const subject = (getHeader(m, "Subject") ?? "").trim();
    const internalDate = m.internalDate ? parseInt(m.internalDate, 10) : 0;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      if (subject && existing.subjects.length < maxSubjects && !existing.subjects.includes(subject)) {
        existing.subjects.push(subject);
      }
      if (internalDate > existing.lastInternalDate) {
        existing.lastInternalDate = internalDate;
        existing.rawFromHeader = fromRaw;
      }
    } else {
      buckets.set(key, {
        email: key,
        name: name ?? email ?? fromRaw,
        rawFromHeader: fromRaw,
        count: 1,
        subjects: subject ? [subject] : [],
        lastInternalDate: internalDate,
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastInternalDate - a.lastInternalDate;
  });
}

/**
 * Build a set of Gmail search queries to find likely Liturgical Year
 * senders. The wizard runs these in order until one returns hits.
 */
export const LITURGICAL_SEARCH_QUERIES: ReadonlyArray<string> = [
  'from:(gueranger OR "guéranger" OR "liturgical year") newer_than:60d',
  'subject:("liturgical year" OR "dom guéranger" OR "dom gueranger") newer_than:60d',
  '("liturgical year" OR "dom guéranger" OR "dom gueranger") newer_than:120d',
];

/** Build a Gmail query that combines a sender-from clause with optional label / window. */
export function buildSenderSearchQuery(opts: {
  fromQuery?: string;
  labelName?: string;
  newerThan?: string;
  extra?: string;
}): string {
  const parts: string[] = [];
  if (opts.fromQuery) {
    // Wrap in `from:(...)` if it doesn't already include `from:` or `label:`.
    const trimmed = opts.fromQuery.trim();
    if (/\bfrom:|label:/i.test(trimmed)) {
      parts.push(trimmed);
    } else {
      parts.push(`from:(${trimmed})`);
    }
  }
  if (opts.labelName) {
    // Gmail label queries replace spaces with hyphens.
    const slug = opts.labelName.replace(/\s+/g, "-");
    parts.push(`label:${slug}`);
  }
  if (opts.newerThan) parts.push(`newer_than:${opts.newerThan}`);
  if (opts.extra) parts.push(opts.extra);
  return parts.join(" ").trim();
}
