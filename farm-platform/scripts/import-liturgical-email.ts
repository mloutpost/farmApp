/**
 * Imports a daily "Liturgical Year" email into Firestore for the
 * Family Dashboard.
 *
 * Two modes:
 *
 *   File / stdin mode (original):
 *     npm run import:liturgy -- --uid <uid> --file /path/to/email.html
 *     npm run import:liturgy -- --uid <uid> --file ./email.eml --date 2026-05-10
 *     cat email.html | npm run import:liturgy -- --uid <uid>
 *
 *   Gmail backfill mode (new — pairs with /family-dashboard/connect-gmail):
 *     npm run import:liturgy -- --uid <uid> --use-saved-source \
 *       --gmail-token <accessToken> --since 7d
 *     npm run import:liturgy -- --uid <uid> --gmail-from "Dom Guéranger <noreply@…>" \
 *       --gmail-token <accessToken> --since 2026-05-01
 *
 * Args:
 *   --uid                Firebase user UID (the user who owns the dashboard).
 *   --file               Path to an email file (.eml, .html, .txt). Optional if stdin is piped.
 *   --date               Override the date (YYYY-MM-DD). Defaults to today (local TZ).
 *                        In Gmail mode, defaults to each message's internalDate.
 *   --source             Label saved on the Firestore doc. Defaults to "email" (file mode)
 *                        or "import" (Gmail mode).
 *   --season             Liturgical season label (e.g. "Time after Pentecost"). Optional.
 *   --no-quote           Skip the OpenAI quote extraction.
 *   --dry                Parse and print without writing to Firestore.
 *   --use-saved-source   Read users/<uid>/familyDashboard/gmailSource and use its
 *                        fromQuery / labelName as defaults. Requires --uid.
 *   --gmail-from "<q>"   Gmail search clause (e.g. "noreply@example.com" or
 *                        'from:(dom OR gueranger)'). Triggers Gmail mode.
 *   --gmail-label "<n>"  Filter Gmail search by label name.
 *   --gmail-token <T>    Gmail OAuth access token (or set GMAIL_ACCESS_TOKEN env).
 *                        Required when fetching from Gmail.
 *   --since <window>     Only used in Gmail mode. "7d" / "30d" / "2026-05-01".
 *                        Defaults to "1d".
 *
 * Authentication:
 *   - Firestore: GOOGLE_APPLICATION_CREDENTIALS service-account JSON, or
 *     `gcloud auth application-default login`. Requires NEXT_PUBLIC_FIREBASE_PROJECT_ID.
 *   - Gmail (backfill mode only): a fresh end-user OAuth access token with the
 *     gmail.readonly scope. The simplest way to mint one is to step through
 *     the wizard at /family-dashboard/connect-gmail (which forces the account
 *     chooser), then in your browser DevTools' Application → Local Storage,
 *     read the most recent network request to www.googleapis.com to get
 *     the bearer token. Tokens last ~1 hour. Pass via --gmail-token <T> or
 *     GMAIL_ACCESS_TOKEN env var.
 *   - For OPENAI quote extraction: OPENAI_API_KEY in .env.local.
 *
 * The script writes to:
 *   users/<uid>/liturgicalYear/<YYYY-MM-DD>
 * and bypasses Firestore security rules (firebase-admin uses a privileged
 * credential).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { parseLiturgicalEmail, sundayCommemorationHeadlines } from "../src/lib/family-dashboard/email-parser";
import { generateQuote } from "../src/lib/family-dashboard/quote-extractor";
import {
  buildSenderSearchQuery,
  extractPlainTextBody,
  getHeader,
  getMessage,
  searchMessages,
} from "../src/lib/family-dashboard/gmail";

interface CliArgs {
  uid?: string;
  file?: string;
  date?: string;
  source?: string;
  season?: string;
  noQuote?: boolean;
  dry?: boolean;
  useSavedSource?: boolean;
  gmailFrom?: string;
  gmailLabel?: string;
  gmailToken?: string;
  since?: string;
  help?: boolean;
}

const HELP = `\
import-liturgical-email — push a daily Dom Guéranger email into the dashboard.

Usage:
  File mode:
    npm run import:liturgy -- --uid <uid> --file /path/to/email.html
    cat email.eml | npm run import:liturgy -- --uid <uid> --date 2026-05-10

  Gmail backfill mode:
    npm run import:liturgy -- --uid <uid> --use-saved-source \\
        --gmail-token <accessToken> --since 7d
    npm run import:liturgy -- --uid <uid> --gmail-from "noreply@example.com" \\
        --gmail-token <accessToken> --since 2026-05-01

Options:
  --uid <uid>                Firebase UID for users/<uid>/liturgicalYear/...
  --file <path>              Email file (.eml, .html, .txt) for file mode.
  --date YYYY-MM-DD          Override entry date (defaults: today / message date).
  --source <label>           Stored on the doc. Default "email" (file) / "import" (Gmail).
  --season "<text>"          Liturgical season label.
  --no-quote                 Skip OpenAI pull-quote extraction.
  --dry                      Parse + log only; do not write to Firestore.
  --use-saved-source         Load fromQuery/labelName from
                             users/<uid>/familyDashboard/gmailSource.
  --gmail-from "<q>"         Gmail "from:" clause or bare email address.
  --gmail-label "<name>"     Gmail label name to scope searches by.
  --gmail-token <T>          OAuth access token (or env GMAIL_ACCESS_TOKEN).
                             Required for Gmail mode.
  --since <window>           "1d" / "7d" / "30d" or "YYYY-MM-DD". Default 1d.
  -h, --help                 Show this message.
`;

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = argv[i + 1];
    const requireValue = (flag: string): string => {
      if (!next) {
        console.error(`Missing value for ${flag}`);
        process.exit(1);
      }
      i++;
      return next;
    };
    if (k === "-h" || k === "--help") {
      out.help = true;
    } else if (k === "--uid") {
      out.uid = requireValue(k);
    } else if (k === "--file") {
      out.file = requireValue(k);
    } else if (k === "--date") {
      out.date = requireValue(k);
    } else if (k === "--source") {
      out.source = requireValue(k);
    } else if (k === "--season") {
      out.season = requireValue(k);
    } else if (k === "--no-quote") {
      out.noQuote = true;
    } else if (k === "--dry") {
      out.dry = true;
    } else if (k === "--use-saved-source") {
      out.useSavedSource = true;
    } else if (k === "--gmail-from") {
      out.gmailFrom = requireValue(k);
    } else if (k === "--gmail-label") {
      out.gmailLabel = requireValue(k);
    } else if (k === "--gmail-token") {
      out.gmailToken = requireValue(k);
    } else if (k === "--since") {
      out.since = requireValue(k);
    }
  }
  return out;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function todayLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Translate `--since` into a Gmail search-clause fragment. Gmail's
 * `newer_than:` operator works for relative durations; absolute dates
 * use `after:`.
 */
function sinceToGmailClause(since: string): string {
  const trimmed = since.trim();
  if (/^\d+[dmy]$/i.test(trimmed)) return `newer_than:${trimmed}`;
  if (isIsoDate(trimmed)) return `after:${trimmed.replace(/-/g, "/")}`;
  // Fall back: assume Gmail-native syntax was passed through.
  return trimmed;
}

function extractBodyFromEml(raw: string): string {
  const headerSep = raw.indexOf("\n\n");
  const body = headerSep >= 0 ? raw.slice(headerSep + 2) : raw;
  const htmlPart = body.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\Z)/i);
  if (htmlPart?.[1]) return htmlPart[1];
  const textPart = body.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\Z)/i);
  if (textPart?.[1]) return textPart[1];
  return body;
}

interface ImportEntry {
  date: string;
  title?: string;
  feast?: string;
  season?: string;
  reflection?: string;
  reflectionLatin?: string;
  collect?: string;
  collectLatin?: string;
  readings?: string;
  readingsLatin?: string;
  quote?: string;
  raw?: string;
  commemorations: string[];
  source: string;
  updatedAt: string;
}

interface ProcessOpts {
  noQuote: boolean;
  season?: string;
  source: string;
  dateOverride?: string;
}

async function processEmailContent(
  raw: string,
  opts: ProcessOpts,
  defaultDate: string
): Promise<ImportEntry> {
  const date = opts.dateOverride && isIsoDate(opts.dateOverride) ? opts.dateOverride : defaultDate;
  const parsed = parseLiturgicalEmail(raw);

  let quote: string | undefined;
  if (!opts.noQuote) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(
        "  OPENAI_API_KEY not set — skipping quote extraction. Use --no-quote to silence."
      );
    } else {
      try {
        const generated = await generateQuote(
          {
            reflection: parsed.reflection,
            collect: parsed.collect,
            feast: parsed.feast,
            title: parsed.title,
          },
          { apiKey }
        );
        if (generated) {
          quote = generated;
          console.log(`  Generated quote (${quote.length} chars).`);
        } else {
          console.log("  Quote extractor returned nothing.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  Quote extraction failed: ${msg}`);
      }
    }
  }

  return {
    date,
    title: parsed.title,
    feast: parsed.feast,
    season: opts.season ?? parsed.season,
    reflection: parsed.reflection,
    reflectionLatin: parsed.reflectionLatin,
    collect: parsed.collect,
    collectLatin: parsed.collectLatin,
    readings: parsed.readings,
    readingsLatin: parsed.readingsLatin,
    quote,
    raw,
    commemorations: sundayCommemorationHeadlines(parsed, 0),
    source: opts.source,
    updatedAt: new Date().toISOString(),
  };
}

function logEntrySummary(entry: ImportEntry): void {
  console.log(`  Parsed entry for ${entry.date}:`);
  console.log({
    title: entry.title,
    feast: entry.feast,
    season: entry.season,
    reflection: entry.reflection?.slice(0, 200) + (entry.reflection && entry.reflection.length > 200 ? "…" : ""),
    reflectionLatin: entry.reflectionLatin
      ? entry.reflectionLatin.slice(0, 120) + (entry.reflectionLatin.length > 120 ? "…" : "")
      : undefined,
    collect: entry.collect?.slice(0, 200) + (entry.collect && entry.collect.length > 200 ? "…" : ""),
    collectLatin: entry.collectLatin
      ? entry.collectLatin.slice(0, 120) + (entry.collectLatin.length > 120 ? "…" : "")
      : undefined,
    readings: entry.readings?.slice(0, 200) + (entry.readings && entry.readings.length > 200 ? "…" : ""),
    readingsLatin: entry.readingsLatin
      ? entry.readingsLatin.slice(0, 120) + (entry.readingsLatin.length > 120 ? "…" : "")
      : undefined,
    quote: entry.quote,
    commemorations: entry.commemorations,
  });
}

function ensureFirebaseAdmin(): FirebaseFirestore.Firestore {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    console.error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local or GCLOUD_PROJECT.");
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
    }
  }
  return admin.firestore();
}

async function writeEntry(
  db: FirebaseFirestore.Firestore,
  uid: string,
  entry: ImportEntry
): Promise<void> {
  const payload: FirebaseFirestore.DocumentData = {
    date: entry.date,
    updatedAt: entry.updatedAt,
    source: entry.source,
    commemorations: entry.commemorations,
  };
  if (entry.raw) payload.raw = entry.raw;
  if (entry.title) payload.title = entry.title;
  if (entry.feast) payload.feast = entry.feast;
  if (entry.season) payload.season = entry.season;
  if (entry.reflection) payload.reflection = entry.reflection;
  if (entry.reflectionLatin) payload.reflectionLatin = entry.reflectionLatin;
  if (entry.collect) payload.collect = entry.collect;
  if (entry.collectLatin) payload.collectLatin = entry.collectLatin;
  if (entry.readings) payload.readings = entry.readings;
  if (entry.readingsLatin) payload.readingsLatin = entry.readingsLatin;
  if (entry.quote) payload.quote = entry.quote;
  await db.collection("users").doc(uid).collection("liturgicalYear").doc(entry.date).set(payload, { merge: true });
}

interface SavedSource {
  emailAddress?: string;
  fromQuery?: string;
  fromName?: string;
  labelId?: string;
  labelName?: string;
}

async function loadSavedSource(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<SavedSource | null> {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("familyDashboard")
    .doc("gmailSource")
    .get();
  if (!snap.exists) return null;
  return (snap.data() as SavedSource) ?? null;
}

async function runFileMode(args: CliArgs): Promise<void> {
  let raw = "";
  if (args.file) {
    const filepath = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
    raw = fs.readFileSync(filepath, "utf8");
    if (filepath.toLowerCase().endsWith(".eml")) {
      raw = extractBodyFromEml(raw);
    }
  } else {
    raw = await readStdin();
  }
  if (!raw.trim()) {
    console.error("No email content. Provide --file <path> or pipe content to stdin.");
    process.exit(1);
  }

  const entry = await processEmailContent(
    raw,
    {
      noQuote: !!args.noQuote,
      season: args.season,
      source: args.source ?? "email",
      dateOverride: args.date,
    },
    todayLocalIso()
  );

  console.log(`\nProcessing single email (file mode):`);
  logEntrySummary(entry);

  if (args.dry) {
    console.log("\n[--dry] Skipping Firestore write.");
    return;
  }

  if (!args.uid) {
    console.error("Missing --uid <firebase-uid>");
    process.exit(1);
  }
  const db = ensureFirebaseAdmin();
  await writeEntry(db, args.uid, entry);
  console.log(`\nWrote users/${args.uid}/liturgicalYear/${entry.date}`);
}

async function runGmailMode(args: CliArgs): Promise<void> {
  if (!args.uid) {
    console.error("Gmail mode requires --uid <firebase-uid>.");
    process.exit(1);
  }
  const token = args.gmailToken ?? process.env.GMAIL_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "Gmail mode requires --gmail-token <T> or GMAIL_ACCESS_TOKEN env var.\n" +
        "Mint a token from /family-dashboard/connect-gmail in your browser."
    );
    process.exit(1);
  }

  let fromQuery = args.gmailFrom;
  let labelName = args.gmailLabel;
  if (args.useSavedSource) {
    const db = ensureFirebaseAdmin();
    const saved = await loadSavedSource(db, args.uid);
    if (!saved) {
      console.error(
        `No saved source at users/${args.uid}/familyDashboard/gmailSource.\n` +
          `Run /family-dashboard/connect-gmail first, or pass --gmail-from explicitly.`
      );
      process.exit(1);
    }
    if (!fromQuery) fromQuery = saved.fromQuery;
    if (!labelName && saved.labelName) labelName = saved.labelName;
    console.log(
      `Loaded saved source: inbox=${saved.emailAddress ?? "?"}, fromQuery=${saved.fromQuery ?? "?"}` +
        (saved.labelName ? `, label=${saved.labelName}` : "")
    );
  }

  if (!fromQuery) {
    console.error("Gmail mode requires --gmail-from <q> (or --use-saved-source).");
    process.exit(1);
  }

  const since = args.since ?? "1d";
  const sinceClause = sinceToGmailClause(since);
  const q = buildSenderSearchQuery({
    fromQuery,
    labelName,
    extra: sinceClause,
  });
  console.log(`\nGmail search: ${q}`);

  const found = await searchMessages(token, q, 100);
  console.log(`Found ${found.messages.length} matching messages.`);
  if (found.messages.length === 0) return;

  const db = args.dry ? null : ensureFirebaseAdmin();
  let written = 0;
  let failed = 0;
  for (const ref of found.messages) {
    try {
      const message = await getMessage(token, ref.id, "full");
      const subject = getHeader(message, "Subject") ?? "(no subject)";
      const internalMs = message.internalDate ? parseInt(message.internalDate, 10) : Date.now();
      const messageDate = isoFromDate(new Date(internalMs));
      console.log(`\n→ ${messageDate}  ${subject}`);

      const body = extractPlainTextBody(message);
      if (!body.trim()) {
        console.warn("  Empty body — skipping.");
        continue;
      }
      const entry = await processEmailContent(
        body,
        {
          noQuote: !!args.noQuote,
          season: args.season,
          source: args.source ?? "import",
          dateOverride: args.date, // present only when caller wants every msg pinned to one day
        },
        messageDate
      );
      logEntrySummary(entry);
      if (args.dry || !db) {
        console.log("  [--dry] Skipping Firestore write.");
        continue;
      }
      await writeEntry(db, args.uid, entry);
      console.log(`  Wrote users/${args.uid}/liturgicalYear/${entry.date}`);
      written++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Import failed: ${msg}`);
    }
  }
  console.log(
    `\nDone. ${written} written${failed ? `, ${failed} failed` : ""}` +
      (args.dry ? " (dry run)" : "")
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const isGmailMode =
    !!args.useSavedSource ||
    !!args.gmailFrom ||
    !!args.gmailLabel ||
    !!args.gmailToken ||
    !!args.since;

  if (isGmailMode) {
    await runGmailMode(args);
  } else {
    await runFileMode(args);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
