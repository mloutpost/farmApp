/**
 * Google Identity Services (GIS) token client for the Family Dashboard.
 *
 * Why this exists: Firebase Auth's Google sign-in returns an access token
 * once at sign-in, but Firebase does NOT auto-refresh that Google access
 * token. The TV runs all morning, so we need a separate way to silently
 * mint fresh access tokens against scopes like calendar.readonly and
 * gmail.readonly.
 *
 * GIS' OAuth 2.0 token client supports `prompt: ''` for silent re-grants
 * after the user has consented once on this browser/profile, and
 * `prompt: 'consent select_account'` to force the account chooser when
 * the user has multiple Google accounts.
 *
 * Scope handling
 * --------------
 * Each (client_id, scope-set) pair gets its own cached GIS token client,
 * so the calendar flow and the Gmail wizard can hold independent grants
 * for potentially different Google accounts (the user signs into Google
 * Calendar with one account and a different one for the inbox that
 * receives the Liturgical Year email).
 *
 * Popup / user-gesture preservation
 * ---------------------------------
 * GIS' `requestAccessToken` opens a `window.open`-style popup that
 * browsers (Brave, Safari, Firefox-strict) will block unless it fires
 * SYNCHRONOUSLY inside the click handler. Even an `await loadGisScript()`
 * in front of it is enough to lose the user-gesture context.
 *
 * To handle that, callers should:
 *   1. Call `prefetchGoogleTokenClient(scope)` on component mount, well
 *      before any click handler. This loads the GIS script and primes
 *      the cached token client without ever opening a popup.
 *   2. Gate the visible "Connect" button on `isGoogleTokenClientReady(scope)`
 *      (or a hook-managed `gisReady` flag) so users only click once the
 *      fast path is available.
 *   3. From the click handler itself, call `requestGoogleAccessToken({...})`
 *      synchronously — no awaits before that call. The fast path inside
 *      this module then invokes `entry.client.requestAccessToken(...)` in
 *      the same synchronous task as the click, preserving the gesture.
 *
 * Usage:
 *   await prefetchGoogleTokenClient(GOOGLE_CALENDAR_SCOPE);   // on mount
 *   // ... later, inside a click handler:
 *   const { accessToken } = await requestGoogleAccessToken();        // calendar
 *   const { accessToken } = await requestGoogleGmailAccessToken({   // gmail
 *     prompt: "consent select_account",
 *   });
 */

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";

export const GOOGLE_GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Default prompt for the Gmail wizard. Forces both consent and the Google
 * account chooser so a user with several Google accounts can pick the
 * inbox that actually receives the Liturgical Year email.
 */
export const GMAIL_ACCOUNT_CHOOSER_PROMPT = "consent select_account";

/**
 * Default prompt for the Calendar first-connect. The user's Google
 * Calendar may live on a different Google account than the one they're
 * signed into the dashboard with (or the one that receives the Liturgical
 * Year email), so we force the account chooser the first time. Silent
 * re-grants still pass `prompt: ""` — see `resolvePrompt`.
 */
export const CALENDAR_ACCOUNT_CHOOSER_PROMPT = "consent select_account";

/**
 * Safety watchdog for non-silent (popup) token requests. The popup
 * itself involves the user picking an account, entering a password,
 * doing 2FA, and reviewing a consent screen — so the wait can run
 * 30-90 seconds in normal use. We only need this watchdog to catch
 * pathological cases where GIS opened nothing AND fired no error
 * callback (rare but observed historically). Set generously so
 * real users completing slow 2FA flows are NEVER timed out behind
 * the user's back. If the popup is blocked outright by the browser,
 * GIS itself almost always fires `popup_failed_to_open` or
 * `popup_closed` immediately, and that surfaces through the
 * callback path — not this watchdog.
 *
 * The previous 5s value was the bug behind the "I picked an account
 * but the wizard never advanced" symptom: GIS did fire the callback
 * eventually, but the watchdog had already drained the pending
 * resolver, so the token was silently discarded.
 */
const POPUP_BLOCKED_WATCHDOG_MS = 180_000;

/**
 * Watchdog for silent token requests. Silent calls (`prompt: ""`)
 * almost always come back within a second; if GIS hasn't fired the
 * callback after this window we assume the silent grant failed in a
 * way that produced no callback (network drop, SDK glitch, third-party
 * cookies blocked). Without this, a stuck silent call would hold the
 * pending slot indefinitely and every subsequent click would throw
 * "request already in flight". Generous so genuine silent refreshes
 * have plenty of headroom.
 */
const SILENT_WATCHDOG_MS = 12_000;

const POPUP_TIMEOUT_MESSAGE =
  "Google's sign-in didn't return a response. If a popup didn't appear, allow popups for this site and try again.";

const SILENT_HANG_MESSAGE =
  "Google didn't respond to the silent sign-in. Click Connect to sign in interactively.";

const PREEMPTED_MESSAGE =
  "Replaced by a newer Google sign-in request.";

const POPUP_BLOCKED_MESSAGE =
  "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";

export interface GoogleAccessTokenResult {
  accessToken: string;
  /** Epoch milliseconds when the token expires. */
  expiresAt: number;
}

interface GisTokenClient {
  callback: (resp: GisTokenResponse) => void;
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GisOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (resp: GisTokenResponse) => void;
  }) => GisTokenClient;
}

interface GoogleNamespace {
  accounts?: { oauth2?: GisOAuth2 };
}

declare global {
  interface Window {
    google?: GoogleNamespace;
  }
}

let gisScriptLoading: Promise<void> | null = null;

/** Resolve as soon as `window.google.accounts.oauth2` becomes available
 *  (or reject after `timeoutMs`). Useful when a `<script>` tag has
 *  already been injected (e.g. by Next.js' <Script /> in the root
 *  layout) but the namespace hasn't hydrated yet — its `load` listener
 *  may have already fired and our `addEventListener` would never see
 *  it. */
function waitForGoogleNamespace(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(id);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(id);
        reject(
          new Error(
            "Google Identity Services script loaded but the oauth2 namespace never appeared."
          )
        );
      }
    }, 50);
  });
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GIS can only load in the browser."));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptLoading) return gisScriptLoading;
  gisScriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`
    );
    if (existing) {
      // The root layout's <Script> tag injected this. Its load event may
      // have already fired (in which case our listener never runs), so
      // we poll for the namespace as the source of truth and fall back
      // to the load listener as a courtesy.
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services script."))
      );
      waitForGoogleNamespace(8_000).then(resolve, reject);
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => waitForGoogleNamespace(4_000).then(resolve, reject);
    s.onerror = () =>
      reject(new Error("Failed to load Google Identity Services script."));
    document.head.appendChild(s);
  });
  return gisScriptLoading;
}

interface PendingResolver {
  resolve: (r: GoogleAccessTokenResult) => void;
  reject: (e: Error) => void;
  /** Marks this resolver as silent so the watchdog can pick the right
   *  timeout / error message and the preempt path can decide whether
   *  to drop it. */
  silent: boolean;
}

interface ClientEntry {
  client: GisTokenClient;
  /**
   * All callers waiting on the *current* in-flight GIS call, in arrival
   * order. Multiple parallel callers — common with React StrictMode
   * double-mount or with auto-connect racing a user click — share a
   * single GIS request and resolve/reject together when its callback
   * fires. Empty array means there is no in-flight request.
   */
  pending: PendingResolver[];
  /** Watchdog timer id for the in-flight GIS request (if any). */
  watchdog: ReturnType<typeof setTimeout> | null;
  /** True iff the active in-flight request is silent — drives the
   *  watchdog timeout and the preempt rules. */
  pendingSilent: boolean;
}

const clientCache = new Map<string, ClientEntry>();

/** Drain all pending resolvers with a single error and clear watchdog
 *  state. Used by the watchdog and by the user-gesture preempt path. */
function drainPending(entry: ClientEntry, error: Error): void {
  const pending = entry.pending;
  entry.pending = [];
  entry.pendingSilent = false;
  if (entry.watchdog !== null) {
    clearTimeout(entry.watchdog);
    entry.watchdog = null;
  }
  for (const p of pending) {
    try {
      p.reject(error);
    } catch {
      // Defensive: a misbehaving caller throwing from .reject must not
      // block the rest of the queue from learning the request died.
    }
  }
}

function clientCacheKey(clientId: string, scope: string): string {
  return `${clientId}::${scope}`;
}

function isPopupBlockedError(resp: GisTokenResponse): boolean {
  const code = resp.error ?? "";
  const desc = resp.error_description ?? "";
  return (
    code === "popup_failed_to_open" ||
    code === "popup_closed" ||
    code === "idpiframe_initialization_failed" ||
    /popup/i.test(desc)
  );
}

function ensureClient(clientId: string, scope: string): ClientEntry {
  const key = clientCacheKey(clientId, scope);
  const existing = clientCache.get(key);
  if (existing) return existing;
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google Identity Services is not available on window.google.");
  }
  const entry: ClientEntry = {
    // initTokenClient is called below; placeholder satisfies the type until then.
    client: undefined as unknown as GisTokenClient,
    pending: [],
    watchdog: null,
    pendingSilent: false,
  };
  entry.client = oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback: (resp) => {
      // Snapshot + clear so re-entrant calls into requestAccessToken
      // from inside a resolver see a fresh state.
      const pending = entry.pending;
      entry.pending = [];
      entry.pendingSilent = false;
      if (entry.watchdog !== null) {
        clearTimeout(entry.watchdog);
        entry.watchdog = null;
      }
      if (pending.length === 0) return;
      if (resp.error) {
        const err = isPopupBlockedError(resp)
          ? new Error(POPUP_BLOCKED_MESSAGE)
          : new Error(
              `Google OAuth error: ${resp.error}${
                resp.error_description ? ` — ${resp.error_description}` : ""
              }`
            );
        for (const p of pending) p.reject(err);
        return;
      }
      if (!resp.access_token) {
        const err = new Error("Google OAuth returned no access_token.");
        for (const p of pending) p.reject(err);
        return;
      }
      const ttlSec = resp.expires_in ?? 3600;
      const result: GoogleAccessTokenResult = {
        accessToken: resp.access_token,
        expiresAt: Date.now() + ttlSec * 1000,
      };
      for (const p of pending) p.resolve(result);
    },
  });
  clientCache.set(key, entry);
  return entry;
}

export interface RequestTokenOptions {
  /** When true, never show the consent UI — only refresh silently.
   *  Ignored if `prompt` is supplied. */
  silent?: boolean;
  /** Override the GIS prompt string ("", "consent", "select_account",
   *  "consent select_account"). Takes precedence over `silent`. */
  prompt?: string;
}

export function getGoogleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  return id && id.trim() ? id.trim() : null;
}

function resolvePrompt(opts: RequestTokenOptions, fallback: string): string {
  if (opts.prompt !== undefined) return opts.prompt;
  if (opts.silent) return "";
  return fallback;
}

/**
 * Load GIS and pre-create the token client for `scope`. Safe to call on
 * mount: it never opens a popup, never calls `requestAccessToken`. After
 * this resolves, `requestGoogleAccessToken*` can be invoked
 * synchronously from a click handler — the popup will open within the
 * user-gesture frame.
 *
 * Quietly no-ops if no `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` is set or
 * we're on the server.
 */
export async function prefetchGoogleTokenClient(scope: string): Promise<void> {
  if (typeof window === "undefined") return;
  const clientId = getGoogleClientId();
  if (!clientId) return;
  await loadGisScript();
  ensureClient(clientId, scope);
}

/**
 * Returns true iff GIS is loaded and a token client for `scope` is
 * already cached — i.e. `requestGoogleAccessToken` will take the
 * synchronous fast path. Use this to enable the "Connect" button only
 * once the popup can fire without an await.
 */
export function isGoogleTokenClientReady(scope: string): boolean {
  if (typeof window === "undefined") return false;
  if (!window.google?.accounts?.oauth2) return false;
  const clientId = getGoogleClientId();
  if (!clientId) return false;
  return clientCache.has(clientCacheKey(clientId, scope));
}

/**
 * Forcibly clear any in-flight pending Google token request for
 * `scope`, rejecting waiters with a friendly message. Safe to call
 * unconditionally — no-ops when no client is cached or nothing is
 * pending. Use sparingly: the request queue + watchdog handle most
 * cases automatically. Reserved for explicit "reset / start over"
 * affordances (e.g. an account-switcher button).
 */
export function cancelPendingTokenRequest(scope: string): void {
  if (typeof window === "undefined") return;
  const clientId = getGoogleClientId();
  if (!clientId) return;
  const entry = clientCache.get(clientCacheKey(clientId, scope));
  if (!entry || entry.pending.length === 0) return;
  drainPending(entry, new Error("Sign-in request cancelled."));
}

function invokeAccessTokenSync(
  clientId: string,
  scope: string,
  opts: RequestTokenOptions,
  fallbackPrompt: string
): Promise<GoogleAccessTokenResult> {
  let entry: ClientEntry;
  try {
    entry = ensureClient(clientId, scope);
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
  const resolvedPrompt = resolvePrompt(opts, fallbackPrompt);
  const isSilent = resolvedPrompt === "";
  return new Promise<GoogleAccessTokenResult>((resolve, reject) => {
    const resolver: PendingResolver = { resolve, reject, silent: isSilent };

    // Three concurrency cases:
    //   (1) No in-flight request           → fire fresh GIS call.
    //   (2) In-flight + new is silent      → join existing waiters.
    //   (3) In-flight + new is non-silent  → preempt: drain the
    //       existing waiters with a friendly "superseded" error and
    //       fire a fresh non-silent GIS call. This is what makes the
    //       user's "Try again" / "Connect" click feel responsive even
    //       if a stale silent call is still hanging.
    const hasPending = entry.pending.length > 0;

    if (hasPending && isSilent) {
      entry.pending.push(resolver);
      return;
    }

    if (hasPending && !isSilent) {
      drainPending(entry, new Error(PREEMPTED_MESSAGE));
    }

    entry.pending = [resolver];
    entry.pendingSilent = isSilent;

    try {
      // CRITICAL: do not put any awaits between the click handler and
      // this line — popup blockers will treat the popup as unsolicited
      // and refuse to open it.
      entry.client.requestAccessToken({ prompt: resolvedPrompt });
    } catch (e) {
      // Synchronous throw from GIS — drain everything we just queued.
      const err = e instanceof Error ? e : new Error(String(e));
      drainPending(entry, err);
      return;
    }

    // Watchdog: GIS sometimes never invokes the callback (popup
    // blocked outright with no error event, third-party cookies
    // blocked, network drop). Without a watchdog the pending slot
    // would persist forever and every subsequent click would throw
    // "request already in flight".
    //
    // Crucially, the non-silent watchdog must be MUCH longer than the
    // silent one — the popup involves human interaction (account
    // pick, password, 2FA, consent) and 30-90s is normal. A short
    // non-silent watchdog would drain the resolver mid-flow, so when
    // GIS finally fired the callback the token would be discarded and
    // the wizard would appear to do nothing. See
    // POPUP_BLOCKED_WATCHDOG_MS for the full rationale.
    const timeoutMs = isSilent ? SILENT_WATCHDOG_MS : POPUP_BLOCKED_WATCHDOG_MS;
    const timeoutMessage = isSilent ? SILENT_HANG_MESSAGE : POPUP_TIMEOUT_MESSAGE;
    entry.watchdog = setTimeout(() => {
      drainPending(entry, new Error(timeoutMessage));
    }, timeoutMs);
  });
}

function requestAccessTokenForScope(
  scope: string,
  opts: RequestTokenOptions,
  fallbackPrompt: string
): Promise<GoogleAccessTokenResult> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(
      new Error(
        "Missing NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID — create a Google Cloud OAuth client and set it in .env.local."
      )
    );
  }
  // Fast path: GIS already loaded → invoke requestAccessToken in the
  // same synchronous task as the click. NEVER await before this point.
  if (
    typeof window !== "undefined" &&
    window.google?.accounts?.oauth2 &&
    clientCache.has(clientCacheKey(clientId, scope))
  ) {
    return invokeAccessTokenSync(clientId, scope, opts, fallbackPrompt);
  }
  // Slow path: GIS not preloaded. The user-gesture context will likely
  // be lost across the script load and the popup will be blocked — the
  // synchronous fast path is the supported route. We still try, but the
  // watchdog + friendly error will guide the user to retry once the
  // prefetch has settled.
  return loadGisScript().then(() =>
    invokeAccessTokenSync(clientId, scope, opts, fallbackPrompt)
  );
}

/**
 * Request a Google Calendar access token (read subscribed calendars + insert
 * events). The non-silent default
 * is `prompt: "consent select_account"` so the user is explicitly
 * shown Google's account chooser on first connect — the personal
 * Calendar may live on a different Google account than the one
 * currently active in the browser. Silent calls (`silent: true`)
 * pass `prompt: ""` for an invisible re-grant.
 */
export function requestGoogleAccessToken(
  opts: RequestTokenOptions = {}
): Promise<GoogleAccessTokenResult> {
  return requestAccessTokenForScope(
    GOOGLE_CALENDAR_SCOPE,
    opts,
    CALENDAR_ACCOUNT_CHOOSER_PROMPT
  );
}

/**
 * Request a gmail.readonly access token. Defaults to
 * `prompt: "consent select_account"` so the wizard always shows Google's
 * account chooser — the whole reason this flow exists is that the user
 * needs to pick which of their inboxes receives the email.
 */
export function requestGoogleGmailAccessToken(
  opts: RequestTokenOptions = {}
): Promise<GoogleAccessTokenResult> {
  return requestAccessTokenForScope(
    GOOGLE_GMAIL_READONLY_SCOPE,
    opts,
    GMAIL_ACCOUNT_CHOOSER_PROMPT
  );
}

/** Best-effort Google account email for the account that granted `accessToken`. */
export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const json = (await res.json()) as { email?: string };
      const email = json.email?.trim();
      if (email) return email;
    }
    const info = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!info.ok) return null;
    const data = (await info.json()) as { email?: string };
    return data.email?.trim() || null;
  } catch {
    return null;
  }
}
