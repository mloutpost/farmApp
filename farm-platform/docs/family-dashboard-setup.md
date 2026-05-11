# Family Dashboard — setup notes

The morning Family Dashboard at `/family-dashboard` pulls together three live
sources besides the local farm data:

1. The daily Dom Guéranger _Liturgical Year_ email (parsed + LLM pull-quote).
2. Today's Google Calendar (the user's primary calendar).
3. The local weather (Open-Meteo, no key required).

This doc covers the one-time setup for the two integrations that need
secrets.

## 1. Google Calendar (`NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`)

The dashboard talks to Google Calendar directly from the browser using
[Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
(the modern OAuth 2.0 token client). Firebase Auth is not enough on its own
because Firebase does not refresh the underlying Google OAuth access token
after sign-in.

Create the OAuth client:

1. Open the [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   page for your Firebase project (`farm-platform-f003f`).
2. Click **Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Authorized JavaScript origins:
   - `http://localhost:3000` — for local dev
   - `https://<your-firebase-hosting-domain>` — e.g. `https://farm-platform-f003f.web.app`
   - Any custom domain you've connected to Firebase Hosting.
5. **Authorized redirect URIs:** none required — GIS uses the postMessage
   token model, not redirects.
6. Make sure the **Google Calendar API** is enabled under
   _APIs & Services → Library_ for the same project.
7. Under _OAuth consent screen_ → _Scopes_, add both:
   - `https://www.googleapis.com/auth/calendar.readonly` — “See your calendars” / view events.
   - `https://www.googleapis.com/auth/calendar.events` — create and update events (used by **Travel planning** to sync vacation blocks and send invites to attendees).

   If you previously only had `calendar.readonly`, existing browsers will prompt for **re-consent** once when the user clicks **Connect Google Calendar** or **Sync to Google Calendar** after this change.

Copy the Client ID into `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=1234567890-xyz.apps.googleusercontent.com
```

After restarting `npm run dev`, the dashboard's "Today's Schedule" panel
shows a **Connect Google Calendar** button. Click it once on the TV (one
gesture per browser profile is required); after that GIS silently refreshes
the token every ~50 minutes for as long as the page stays open, and on
hard reloads the dashboard will silently re-grant a token without any
visible UI.

The token never reaches the server. Events are fetched from the browser
directly with `Authorization: Bearer <token>`.

## 2. Connect a Gmail inbox (Liturgical Year wizard)

The morning Liturgical Year email is **its own** integration with **its own
OAuth scope** (`gmail.readonly`). The user often wants to authorize a
*different* Google account from the one they signed into the dashboard
with — the family-dashboard sign-in might be one Google account while the
Dom Guéranger newsletter lives in another. The wizard at
`/family-dashboard/connect-gmail` makes that choice explicit.

### Add the Gmail scope to the OAuth consent screen

The same OAuth client used for Google Calendar also serves the Gmail
flow — they just need an additional scope:

1. In Google Cloud Console → _APIs & Services → OAuth consent screen → Scopes_
   add `https://www.googleapis.com/auth/gmail.readonly`. It shows up in the
   picker as **"Read all your email, including attachments"**.
2. While you're in _APIs & Services → Library_, enable the **Gmail API**
   for the project.
3. No new client ID is needed — `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` is
   reused. (If your app is still in `Testing` mode, make sure the Google
   account that receives the daily email is listed as a Test user.)

### Walk-through

The wizard is reachable two ways:

- **Discreet "Feed →" link** in the bottom-right of the family dashboard
  → **Connect Gmail Inbox →** at the top of the feed page.
- Direct deep link: `/family-dashboard/connect-gmail`.

It steps through:

1. Welcome / sign-in gate.
2. **Connect Google.** Always opens the account chooser
   (`prompt: "consent select_account"`) so a multi-account user can pick
   the inbox that actually receives the email.
3. **Confirm authorized email.** Calls `users/me/profile` and shows the
   `emailAddress` for the user to confirm — with a one-click _"Pick a
   different account"_ if it's the wrong one.
4. **Choose sender.** Searches Gmail for likely Guéranger senders
   (`from:(gueranger OR "guéranger" OR "liturgical year") newer_than:60d`,
   plus a fallback subject query) and groups results by `From:` address;
   pick a candidate or paste your own search clause
   (e.g. `noreply@example.com`).
5. **Optional Gmail label** — surfaces user labels (highlights any whose
   name mentions "liturgy" / "year") for an extra filter clause.
6. **Preview today's email** side-by-side: the raw Gmail body next to
   `parseLiturgicalEmail`'s output, with **"Save to today's dashboard
   entry"** that writes through `saveLiturgicalEntryToFirestore`.
7. **Done** — links back to the dashboard and prints a copy-paste
   command for `npm run import:liturgy` that uses the saved source
   for backfills.

The chosen inbox + sender (+ optional label) are persisted to:

```
users/<uid>/familyDashboard/gmailSource
```

so both the TV (which surfaces the connected source on the feed page)
and the CLI (`--use-saved-source`) can read it.

### Backfill with the CLI

Once the wizard is set up, you can backfill a window of past emails
from your machine. The browser can't run the OpenAI quote extractor
(API keys would leak), so the CLI handles that step:

```bash
npm run import:liturgy -- \
  --uid <your-firebase-uid> \
  --use-saved-source \
  --gmail-token <fresh-access-token> \
  --since 7d
```

Or override the saved source on the fly:

```bash
npm run import:liturgy -- --uid <uid> \
  --gmail-from "Dom Guéranger <noreply@example.com>" \
  --gmail-label "Liturgical Year" \
  --gmail-token <T> \
  --since 2026-05-01
```

Token minting: the simplest way is to step through the wizard, then in
your browser DevTools' Network tab grab the bearer token off any
request to `www.googleapis.com/gmail/...` after you authorize. Tokens
last about an hour. Pass via `--gmail-token <T>` or set
`GMAIL_ACCESS_TOKEN` in your shell.

The original file / stdin modes still work for one-off imports without
Gmail access:

```bash
npm run import:liturgy -- --uid <uid> --file ./email.eml --date 2026-05-10
cat email.html | npm run import:liturgy -- --uid <uid>
```

`--no-quote`, `--season "Time after Pentecost"`, `--source manual`, and
`--dry` continue to behave the same.

## 3. Daily Guéranger pull-quote (`OPENAI_API_KEY`)

The dashboard renders one centered pull-quote from the morning email. To
keep the static export self-contained (no Next API routes, no Cloud
Functions yet), the LLM call lives inside the existing CLI:

```bash
npm run import:liturgy -- --uid <firebase-uid> --file /path/to/email.html
```

The script reads `OPENAI_API_KEY` from `.env.local`, asks GPT-4o-mini for
one-or-two verbatim sentences from the reflection, and writes the result
to the same Firestore doc as the parsed email
(`users/<uid>/liturgicalYear/<YYYY-MM-DD>` → `quote` field). The TV
subscribes to that doc, so the new quote appears automatically.

If you don't want to spend tokens or are offline, pass `--no-quote`. You
can always paste a quote by hand on `/family-dashboard/feed` — there's a
**Quote of the day** field that overrides the LLM result.

Hooking the script up to your inbox (Mac Mail rule, Hazel, Cloudflare
Email Routing → script) is documented inline at the bottom of
`/family-dashboard/feed`.
