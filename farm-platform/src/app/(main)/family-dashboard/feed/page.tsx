"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiturgicalYearStore } from "@/store/liturgical-year-store";
import { useLiturgicalYearSync } from "@/hooks/useLiturgicalYearSync";
import { parseLiturgicalEmail } from "@/lib/family-dashboard/email-parser";
import { useGmailSourceStore } from "@/store/gmail-source-store";
import { useGmailSourceSync } from "@/hooks/useGmailSourceSync";

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LiturgicalFeedPage() {
  const entries = useLiturgicalYearStore((s) => s.entries);
  const { saveEntry, deleteEntry, signedIn } = useLiturgicalYearSync();
  // Subscribe to the saved Gmail source so it's surfaced at the top of the
  // feed page (and survives across reloads via the Zustand persist layer).
  useGmailSourceSync();
  const gmailSource = useGmailSourceStore((s) => s.source);

  const [date, setDate] = useState<string>(todayIsoLocal());
  const [raw, setRaw] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [feast, setFeast] = useState<string>("");
  const [season, setSeason] = useState<string>("");
  const [reflection, setReflection] = useState<string>("");
  const [collect, setCollect] = useState<string>("");
  const [readings, setReadings] = useState<string>("");
  const [quote, setQuote] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const local = entries[date];
    if (local) {
      setTitle(local.title ?? "");
      setFeast(local.feast ?? "");
      setSeason(local.season ?? "");
      setReflection(local.reflection ?? "");
      setCollect(local.collect ?? "");
      setReadings(local.readings ?? "");
      setQuote(local.quote ?? "");
      setRaw(local.raw ?? "");
      return;
    }
    setTitle("");
    setFeast("");
    setSeason("");
    setReflection("");
    setCollect("");
    setReadings("");
    setQuote("");
    setRaw("");
  }, [date, entries]);

  const recentLocal = useMemo(() => {
    return Object.values(entries)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [entries]);

  const handleAutoParse = () => {
    const parsed = parseLiturgicalEmail(raw);
    if (parsed.title) setTitle(parsed.title);
    if (parsed.feast) setFeast(parsed.feast);
    if (parsed.reflection) setReflection(parsed.reflection);
    if (parsed.collect) setCollect(parsed.collect);
    if (parsed.readings) setReadings(parsed.readings);
    setMessage("Auto-parsed. Review and tidy as needed, then Save.");
  };

  const handleSave = async () => {
    setMessage("");
    setBusy(true);
    try {
      await saveEntry({
        date,
        title: title.trim() || undefined,
        feast: feast.trim() || undefined,
        season: season.trim() || undefined,
        reflection: reflection.trim() || undefined,
        collect: collect.trim() || undefined,
        readings: readings.trim() || undefined,
        quote: quote.trim() || undefined,
        raw: raw || undefined,
        source: "manual",
      });
      setMessage(
        signedIn
          ? "Saved to Firestore. The dashboard will refresh automatically."
          : "Saved locally. Sign in to sync this entry to your TV."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!entries[date]) return;
    if (!window.confirm(`Remove the entry for ${date}?`)) return;
    setBusy(true);
    try {
      await deleteEntry(date);
      setMessage("Removed.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded border border-amber-900/25 bg-white/95 px-3 py-2 text-stone-900 outline-none ring-amber-900/15 focus:ring-2";

  return (
    <div className="min-h-screen w-full bg-[#f5ead0] text-[#1a1510]">
      <header className="bg-[#163c26] text-[#f5e6c8] px-6 py-4 flex items-center justify-between border-b-2 border-[#0f2a1a]">
        <div>
          <p className="font-serif tracking-[0.2em] text-xs uppercase text-[#c9a227]">Family dashboard</p>
          <h1 className="font-serif text-2xl">Liturgical Year — Daily Feed</h1>
          {!signedIn && (
            <p className="text-xs text-[#f5e6c8]/75 mt-1">
              Signed out — entries are saved locally on this device only.
            </p>
          )}
        </div>
        <Link
          href="/family-dashboard"
          className="font-serif underline decoration-[#c9a227]/60 hover:decoration-[#c9a227]"
        >
          ← Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8 font-serif">
        <section
          className="rounded-md border-2 bg-[#fffaee] shadow"
          style={{ borderColor: "#1f3a55" }}
        >
          <div
            className="px-5 py-2.5 border-b-2 flex items-center justify-between gap-3"
            style={{ background: "#1f3a55", color: "#f5ead0", borderColor: "#0f2842" }}
          >
            <h2 className="tracking-[0.18em] text-base uppercase">
              Connect Gmail Inbox
            </h2>
            {gmailSource && (
              <span
                className="text-xs tracking-[0.15em] uppercase opacity-80"
                style={{ fontStyle: "italic" }}
              >
                Connected
              </span>
            )}
          </div>
          <div className="p-5 sm:p-6 space-y-3">
            {gmailSource ? (
              <div className="space-y-2">
                <p className="text-sm text-[#3d2410]">
                  The dashboard automatically pulls the daily Liturgical Year email from:
                </p>
                <div className="rounded border border-[#1f3a55]/40 bg-[#fdf7e6] px-4 py-3 text-sm text-[#1a1510] space-y-1">
                  <p>
                    <span className="text-xs uppercase tracking-[0.18em] text-[#5b4a36]">Inbox:</span>{" "}
                    <strong>{gmailSource.emailAddress}</strong>
                  </p>
                  <p>
                    <span className="text-xs uppercase tracking-[0.18em] text-[#5b4a36]">Sender:</span>{" "}
                    <code className="rounded bg-[#ebe3cf] px-1 text-[12.5px]">{gmailSource.fromQuery}</code>
                    {gmailSource.fromName && (
                      <span className="ml-2 text-[#5b4a36]">({gmailSource.fromName})</span>
                    )}
                  </p>
                  {gmailSource.labelName && (
                    <p>
                      <span className="text-xs uppercase tracking-[0.18em] text-[#5b4a36]">Label:</span>{" "}
                      <code className="rounded bg-[#ebe3cf] px-1 text-[12.5px]">{gmailSource.labelName}</code>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/family-dashboard/connect-gmail"
                    className="min-h-[44px] inline-flex items-center rounded-md bg-[#1f3a55] px-4 py-2 text-sm font-medium text-[#f5ead0] hover:bg-[#163049]"
                  >
                    Re-run wizard
                  </Link>
                  <span className="text-xs text-[#5b4a36]">
                    Updated {new Date(gmailSource.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#3d2410]">
                  Walk through a short wizard to authorize a Google account, pick the Dom Guéranger sender,
                  and import today&apos;s email automatically.
                </p>
                <div className="pt-1">
                  <Link
                    href="/family-dashboard/connect-gmail"
                    className="min-h-[44px] inline-flex items-center rounded-md bg-[#1f3a55] px-5 py-2.5 text-sm font-semibold tracking-[0.12em] uppercase text-[#f5ead0] hover:bg-[#163049]"
                  >
                    Connect Gmail Inbox →
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-md border-2 border-[#5a1414] bg-[#fffaee] shadow">
          <div className="bg-[#7a1818] text-[#f6e2b8] px-5 py-2.5 border-b-2 border-[#4a0f0f]">
            <h2 className="tracking-[0.18em] text-base uppercase text-center">Paste today&apos;s email</h2>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] items-end gap-3">
              <label className="text-sm text-[#4a3f35]">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`mt-1 ${field}`}
                />
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleAutoParse}
                  disabled={!raw.trim()}
                  className="min-h-[44px] rounded-md border-2 border-[#5a1414] bg-[#fffaee] px-4 py-2 text-sm font-medium text-[#5a1414] hover:bg-[#5a1414]/10 disabled:opacity-40"
                >
                  Auto-parse pasted text
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="min-h-[44px] rounded-md bg-[#5a1414] px-4 py-2 text-sm font-medium text-[#f6e2b8] hover:bg-[#4a0f0f] disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="min-h-[44px] rounded-md border border-[#5a1414]/50 px-3 py-2 text-sm text-[#5a1414] hover:bg-[#5a1414]/10 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

            <label className="block text-sm text-[#4a3f35]">
              Email content (HTML or plain text)
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={10}
                placeholder="Paste the entire email here — the parser handles HTML or plain text and looks for Collect, Mass Readings, and reflection sections."
                className={`mt-1 ${field}`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[#4a3f35]">
                Title / headline (optional)
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${field}`} />
              </label>
              <label className="block text-sm text-[#4a3f35]">
                Feast (e.g. &quot;Feast of St. Teresa of Avila&quot;)
                <input value={feast} onChange={(e) => setFeast(e.target.value)} className={`mt-1 ${field}`} />
              </label>
            </div>

            <label className="block text-sm text-[#4a3f35]">
              Liturgical season (shown on the dashboard header — e.g. &quot;Time after Pentecost&quot;)
              <input value={season} onChange={(e) => setSeason(e.target.value)} className={`mt-1 ${field}`} />
            </label>

            <label className="block text-sm text-[#4a3f35]">
              Quote of the day
              <span className="block text-xs text-[#5b4a36]/80 font-normal mt-0.5">
                One or two sentences from the reflection — featured as the main pull-quote on the TV dashboard.
                Leave blank to use whatever the import script generated; clear it to fall back to the full reflection.
              </span>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                rows={3}
                className={`mt-1 ${field}`}
              />
            </label>

            <label className="block text-sm text-[#4a3f35]">
              Reflection
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={5}
                className={`mt-1 ${field}`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-[#4a3f35]">
                Collect
                <textarea
                  value={collect}
                  onChange={(e) => setCollect(e.target.value)}
                  rows={4}
                  className={`mt-1 ${field}`}
                />
              </label>
              <label className="block text-sm text-[#4a3f35]">
                Mass readings
                <textarea
                  value={readings}
                  onChange={(e) => setReadings(e.target.value)}
                  rows={4}
                  className={`mt-1 ${field}`}
                />
              </label>
            </div>

            {message && <p className="text-sm text-[#4a0f0f]">{message}</p>}
          </div>
        </section>

        <section className="rounded-md border border-[#6b4c2c]/40 bg-white/70 shadow-sm">
          <header className="px-5 py-3 border-b border-[#6b4c2c]/30">
            <h2 className="text-base font-semibold text-[#3d2410]">Recent saved entries</h2>
          </header>
          {recentLocal.length === 0 ? (
            <p className="px-5 py-6 text-[#4a3f35]">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-[#6b4c2c]/15">
              {recentLocal.map((e) => (
                <li
                  key={e.date}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#3d2410]">
                      {e.date}
                      {e.feast ? ` — ${e.feast}` : e.title ? ` — ${e.title}` : ""}
                    </p>
                    <p className="text-sm text-[#4a3f35] truncate">
                      {(e.reflection ?? "").slice(0, 120) || "(no reflection)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDate(e.date)}
                    className="text-sm text-[#5a1414] underline decoration-[#5a1414]/40 hover:decoration-[#5a1414]"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-[#6b4c2c]/40 bg-white/70 px-5 py-4 shadow-sm text-sm text-[#3d2410] space-y-3">
          <h2 className="text-base font-semibold">Automate from your email</h2>
          <p>
            This app is a static site, so it doesn&apos;t run its own server — but it does sync
            through Firestore. To automatically feed your daily email into the dashboard,
            you have two ready paths:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <strong>Local script (zero hosting).</strong> Save the daily email as a{" "}
              <code className="rounded bg-[#ebe3cf] px-1">.eml</code> /{" "}
              <code className="rounded bg-[#ebe3cf] px-1">.html</code> /{" "}
              <code className="rounded bg-[#ebe3cf] px-1">.txt</code> file (Gmail filters can do this on macOS via Apple Mail rules or a Hazel rule) and run:
              <pre className="mt-1 overflow-x-auto rounded bg-[#1a1510] text-[#f5e6c8] p-3 text-xs">{`npm run import:liturgy -- --uid <your-firebase-uid> --file /path/to/email.html
# or with --date 2026-05-10 to override`}</pre>
              The script parses the email and writes to{" "}
              <code className="rounded bg-[#ebe3cf] px-1">users/&lt;uid&gt;/liturgicalYear/&lt;date&gt;</code>
              . The TV picks it up live.
            </li>
            <li>
              <strong>Cloud webhook.</strong> Use Zapier / Make / Mailgun routes / Cloudflare Email Routing → Firebase Function. Have the workflow call your function with the email body; the function uses{" "}
              <code className="rounded bg-[#ebe3cf] px-1">firebase-admin</code> to write the same Firestore doc.
            </li>
          </ol>
          <p className="text-xs text-[#5b4a36]">
            Whichever path you choose, the dashboard reads from the same Firestore collection, so
            you can mix manual paste, local script, and cloud webhook freely.
          </p>
        </section>
      </main>
    </div>
  );
}
