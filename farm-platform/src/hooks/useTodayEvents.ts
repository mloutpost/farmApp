"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleCalendarStore } from "@/store/google-calendar-store";
import {
  GOOGLE_CALENDAR_SCOPE,
  fetchGoogleAccountEmail,
  getGoogleClientId,
  prefetchGoogleTokenClient,
  requestGoogleAccessToken,
  type GoogleAccessTokenResult,
} from "@/lib/family-dashboard/google-token";
import { fetchTodayEvents } from "@/lib/family-dashboard/google-calendar";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface UseTodayEventsResult {
  /** Triggers an interactive consent flow. Must be invoked from a user
   *  gesture (click handler). Returns synchronously — the OAuth popup
   *  opens within the gesture frame; results land asynchronously via the
   *  google-calendar store. */
  connect: () => void;
  /** Forces a refetch using the cached token (or refreshes it silently). */
  refresh: () => Promise<void>;
  /** Forgets the connection on this browser (does not revoke remote grants). */
  disconnect: () => void;
  /** True if NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is configured. */
  configured: boolean;
  /** True once GIS is loaded and the calendar token client is primed —
   *  i.e. `connect()` can fire its popup synchronously inside a click
   *  handler. Bind to the visible "Connect Google Calendar" button's
   *  `disabled` state. */
  gisReady: boolean;
}

/**
 * Wires the Family Dashboard's "Today's Schedule" panel to Google Calendar.
 *
 * - On mount: pre-loads GIS and primes the calendar token client so the
 *   user-gesture popup can fire synchronously.
 * - On mount (if the user previously consented on this browser): attempts
 *   a silent token refresh and fetches today's events.
 * - Every 15 minutes: refetches today's events (silently refreshing the
 *   token first if it's about to expire). Bails out after any error so
 *   we don't spam Google after a popup-blocked or revoked-grant failure.
 * - At local midnight: refetches so the panel rolls over to the new day.
 */
export function useTodayEvents(): UseTodayEventsResult {
  const status = useGoogleCalendarStore((s) => s.status);
  const hasConsented = useGoogleCalendarStore((s) => s.hasConsented);
  const tokenExpiresAt = useGoogleCalendarStore((s) => s.tokenExpiresAt);
  const setEvents = useGoogleCalendarStore((s) => s.setEvents);
  const setStatus = useGoogleCalendarStore((s) => s.setStatus);
  const setHasConsented = useGoogleCalendarStore((s) => s.setHasConsented);
  const setEmailAddress = useGoogleCalendarStore((s) => s.setEmailAddress);
  const setTokenExpiresAt = useGoogleCalendarStore((s) => s.setTokenExpiresAt);
  const reset = useGoogleCalendarStore((s) => s.reset);

  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number | null>(tokenExpiresAt);
  const inFlightRef = useRef(false);
  // Mirror of `status` for use inside interval/timeout callbacks. Lets the
  // timers read the live status without re-binding every state change.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const configured = !!getGoogleClientId();

  const [gisReady, setGisReady] = useState(false);

  // Pre-load GIS + token client on mount. This is what enables the
  // synchronous popup-from-gesture path in connect() below — without it,
  // the first click after a fresh page load would await `loadGisScript()`
  // and Brave / Safari would block the popup.
  useEffect(() => {
    if (!configured) {
      setGisReady(false);
      return;
    }
    let cancelled = false;
    void prefetchGoogleTokenClient(GOOGLE_CALENDAR_SCOPE)
      .then(() => {
        if (!cancelled) setGisReady(true);
      })
      .catch(() => {
        // Surfaced when the user clicks Connect — the slow path in
        // requestGoogleAccessToken will retry the load and the watchdog
        // / popup-blocked error will tell them what's wrong.
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  /** Refresh the access token silently. Used by the auto-connect / interval
   *  / midnight effects — never called from a user gesture so it's safe to
   *  await freely. */
  const rememberAccountEmail = useCallback(
    async (accessToken: string) => {
      const email = await fetchGoogleAccountEmail(accessToken);
      if (email) setEmailAddress(email);
    },
    [setEmailAddress]
  );

  const ensureFreshTokenSilent = useCallback(async (): Promise<string> => {
    const now = Date.now();
    const cachedExpiry = expiresAtRef.current ?? 0;
    if (
      accessTokenRef.current &&
      cachedExpiry - TOKEN_REFRESH_BUFFER_MS > now
    ) {
      return accessTokenRef.current;
    }
    const result = await requestGoogleAccessToken({ silent: true });
    accessTokenRef.current = result.accessToken;
    expiresAtRef.current = result.expiresAt;
    setTokenExpiresAt(result.expiresAt);
    setHasConsented(true);
    void rememberAccountEmail(result.accessToken);
    return result.accessToken;
  }, [rememberAccountEmail, setHasConsented, setTokenExpiresAt]);

  /**
   * Silent failures fall into two buckets:
   *   - "Soft" failures (interaction required, popup blocked, watchdog
   *     timeout, request superseded by a user click) just mean the
   *     user needs to take an explicit action — the panel should drop
   *     back to its friendly "Connect Google Calendar" state, NOT a
   *     scary red error.
   *   - "Hard" failures (real network errors, OAuth misconfiguration)
   *     warrant the error state with the underlying message.
   * This regex matches the soft-failure messages emitted by
   * `google-token.ts` so we can tell them apart cleanly.
   */
  const isSoftSilentFailure = (msg: string): boolean =>
    /interaction[_ ]required|consent[_ ]required|login[_ ]required|popup|browser blocked|silent sign-in|superseded|cancelled|in flight/i
      .test(msg);

  const silentFetchAndStore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await ensureFreshTokenSilent();
      const events = await fetchTodayEvents(token);
      setEvents(events);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isSoftSilentFailure(msg)) {
        // Stay idle so the visible Connect button remains usable
        // instead of showing a red error the user can't really act
        // on. The next user gesture will re-mint the token.
        setStatus("idle");
      } else {
        setStatus("error", msg);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [ensureFreshTokenSilent, setEvents, setStatus]);

  /**
   * Kick off an interactive OAuth flow. CRITICAL: must be invoked
   * synchronously from a click handler. We deliberately keep this
   * function non-`async` and call `requestGoogleAccessToken` BEFORE any
   * awaits so the popup opens within the user-gesture frame; the
   * resulting Promise resolves later and that's when we fetch events.
   */
  const connect = useCallback((): void => {
    if (!configured) {
      setStatus(
        "error",
        "Set NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in .env.local before connecting."
      );
      return;
    }
    // Force-clear local in-flight guard. A previous silent attempt may
    // have hung; we must NOT silently bail here or the user's click
    // would feel dead. The token client itself preempts any stale
    // pending request when it sees a non-silent call (see
    // invokeAccessTokenSync in google-token.ts).
    inFlightRef.current = true;
    setStatus("connecting");

    let tokenPromise: Promise<GoogleAccessTokenResult>;
    try {
      // SYNCHRONOUS popup-opening call. The fast path inside
      // requestGoogleAccessToken invokes `entry.client.requestAccessToken`
      // in this same task, so the user-gesture context is preserved.
      tokenPromise = requestGoogleAccessToken({ silent: false });
    } catch (e) {
      inFlightRef.current = false;
      setStatus("error", e instanceof Error ? e.message : String(e));
      return;
    }

    tokenPromise
      .then(async (result) => {
        accessTokenRef.current = result.accessToken;
        expiresAtRef.current = result.expiresAt;
        setTokenExpiresAt(result.expiresAt);
        setHasConsented(true);
        void rememberAccountEmail(result.accessToken);
        const events = await fetchTodayEvents(result.accessToken);
        setEvents(events);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        // If this user-gesture call was preempted by a newer one
        // (extremely rapid double-click), let the newer call own the
        // status — don't flash an error in between.
        if (/superseded|cancelled/i.test(msg)) return;
        // Log the original error to devtools so the precise GIS
        // failure code is recoverable for debugging — the UI string
        // is friendly but loses detail.
        // eslint-disable-next-line no-console
        console.error("[useTodayEvents] Google sign-in failed:", e);
        setStatus("error", msg);
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [configured, rememberAccountEmail, setEvents, setHasConsented, setStatus, setTokenExpiresAt]);

  const refresh = useCallback(async () => {
    if (!configured || !hasConsented) return;
    if (status === "error") return;
    await silentFetchAndStore();
  }, [configured, hasConsented, silentFetchAndStore, status]);

  const disconnect = useCallback(() => {
    accessTokenRef.current = null;
    expiresAtRef.current = null;
    reset();
  }, [reset]);

  // Auto-connect on mount when the user has previously consented. Skip
  // if the store has already recorded an error (e.g. from a refresh in
  // a previous render) so we don't loop on broken consent.
  useEffect(() => {
    if (!configured || !hasConsented) return;
    if (statusRef.current === "error") return;
    void silentFetchAndStore();
  }, [configured, hasConsented, silentFetchAndStore]);

  // Periodic refresh every 15 minutes. Bails out if status has flipped
  // to "error" so a popup-blocked failure (or any other error) doesn't
  // keep firing Google requests in the background — the user reported
  // exactly this loop.
  useEffect(() => {
    if (!configured || !hasConsented) return;
    const id = setInterval(() => {
      const s = statusRef.current;
      if (s !== "connected" && s !== "idle") return;
      void silentFetchAndStore();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [configured, hasConsented, silentFetchAndStore]);

  // Roll over at local midnight. Same status gate as the interval.
  useEffect(() => {
    if (!configured || !hasConsented) return;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 30, 0);
    const wait = tomorrow.getTime() - now.getTime();
    const id = setTimeout(() => {
      const s = statusRef.current;
      if (s !== "connected" && s !== "idle") return;
      void silentFetchAndStore();
    }, wait);
    return () => clearTimeout(id);
  }, [configured, hasConsented, silentFetchAndStore]);

  return { connect, refresh, disconnect, configured, gisReady };
}
