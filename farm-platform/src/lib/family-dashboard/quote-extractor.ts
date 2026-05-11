/**
 * Pulls a single pertinent quote from a Dom Guéranger "Liturgical Year"
 * email reflection using OpenAI's chat completions API.
 *
 * The static export of the dashboard cannot host this call from the
 * browser (the API key would leak), so this runs from `npm run import:liturgy`
 * (or any future Cloud Function). The result is cached on the Firestore
 * doc as `quote` and rendered verbatim by the TV.
 */

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "You are a careful editor preparing a single sentence (or at most two) for a family's morning",
  "dashboard. The text is from Dom Prosper Guéranger's L'Année Liturgique (The Liturgical Year),",
  "delivered as a daily email.",
  "",
  "Pick the one sentence (or two consecutive sentences, never more) from the passage that best",
  "captures its spiritual heart for the day. The sentence(s) MUST be returned verbatim from the",
  "passage — preserve original wording, punctuation, and capitalization. Do not paraphrase, do",
  "not add ellipses or attribution, do not add commentary. Return only the chosen sentence(s),",
  "with no surrounding quotation marks.",
].join("\n");

export interface QuoteExtractorInput {
  /** Primary text we want a quote from (the morning reflection). */
  reflection?: string;
  /** Fallback text if the reflection is missing (collect prayer, etc.). */
  collect?: string;
  /** Feast name, used only as light context for the model. */
  feast?: string;
  title?: string;
}

export interface QuoteExtractorOptions {
  apiKey: string;
  model?: string;
  /** Allow swapping the OpenAI base URL (e.g. for self-hosted compatible servers). */
  baseUrl?: string;
  /** Network fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Override for tests. */
  signal?: AbortSignal;
}

/** Strips a single layer of wrapping ASCII or curly quotes the model sometimes adds despite instructions. */
function stripWrappingQuotes(s: string): string {
  const trimmed = s.trim();
  const open = trimmed.charAt(0);
  const close = trimmed.charAt(trimmed.length - 1);
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["\u201C", "\u201D"],
    ["\u2018", "\u2019"],
    ["\u00AB", "\u00BB"],
  ];
  for (const [o, c] of pairs) {
    if (open === o && close === c) return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export async function generateQuote(
  input: QuoteExtractorInput,
  opts: QuoteExtractorOptions
): Promise<string | null> {
  const passage = (input.reflection?.trim() || input.collect?.trim() || "").slice(0, 6000);
  if (!passage) return null;
  const ctxParts: string[] = [];
  if (input.feast) ctxParts.push(`Feast: ${input.feast}`);
  if (input.title && input.title !== input.feast) ctxParts.push(`Title: ${input.title}`);
  const context = ctxParts.length ? `\n\nContext:\n${ctxParts.join("\n")}` : "";

  const userPrompt = `Passage:\n"""${passage}"""${context}\n\nReturn the chosen sentence(s) verbatim from the passage.`;

  const baseUrl = opts.baseUrl ?? "https://api.openai.com/v1";
  const fetchFn = opts.fetchImpl ?? fetch;
  const res = await fetchFn(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  const cleaned = stripWrappingQuotes(raw).replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 600);
}
