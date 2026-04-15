"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function UserMenu() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 56, right: 24 });
  const [menuPos, setMenuPos] = useState({ top: 56, right: 24 });

  useEffect(() => {
    if (signInOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [signInOpen]);

  useEffect(() => {
    if (open && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const signInPortal = document.getElementById("sign-in-portal");
      const userMenuPortal = document.getElementById("user-menu-portal");
      if (menuRef.current && !menuRef.current.contains(target) && !signInPortal?.contains(target) && !userMenuPortal?.contains(target)) {
        setOpen(false);
        setSignInOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setSignInOpen(false);
    } catch (e) {
      const err = e as AuthError;
      if (err?.code === "auth/popup-blocked") {
        setAuthError("Popup blocked. Allow popups for this site, or try again.");
      } else if (err?.code === "auth/popup-closed-by-user") {
        setAuthError(null);
      } else {
        setAuthError(err?.message ?? "Google sign-in failed");
      }
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setSignInOpen(false);
      setEmail("");
      setPassword("");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut(auth);
  };

  if (loading) {
    return (
      <span className="text-xs font-medium tracking-wide text-text-muted uppercase animate-pulse">
        Farm Platform
      </span>
    );
  }

  if (!user) {
    const signInPanel = (
      <div
        id="sign-in-portal"
        className="fixed w-72 rounded-lg border border-border bg-bg-elevated shadow-xl p-4 z-[100]"
        style={{
          top: panelPos.top,
          right: panelPos.right,
        }}
      >
            <h3 className="text-sm font-semibold text-text-primary mb-3">Sign in</h3>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50 mb-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
            <p className="text-[10px] text-text-muted -mt-2 mb-2">Opens a popup to sign in with Google</p>

            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent"
              />
              {authError && (
                <p className="text-xs text-danger">{authError}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {authLoading ? "…" : isSignUp ? "Create account" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                className="w-full text-xs text-text-muted hover:text-text-primary"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Create one"}
              </button>
            </form>
      </div>
    );

    return (
      <div className="relative" ref={menuRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setSignInOpen((prev) => !prev)}
          className="text-xs font-medium tracking-wide text-accent hover:text-accent-hover uppercase"
        >
          Sign in
        </button>
        {signInOpen && typeof document !== "undefined" && createPortal(signInPanel, document.body)}
      </div>
    );
  }

  const displayName = user.email ?? user.displayName ?? "Signed in";

  const userMenuPanel = (
    <div
      id="user-menu-portal"
      className="fixed w-56 rounded-lg border border-border bg-bg-elevated shadow-xl py-2 z-[100]"
      style={{
        top: menuPos.top,
        right: menuPos.right,
      }}
    >
      <div className="px-4 py-2 border-b border-border">
        <p className="text-xs text-text-muted">Signed in as</p>
        <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
      </div>
      <button
        type="button"
        onClick={() => { setOpen(false); router.push("/tax"); }}
        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        Tax planning
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); router.push("/settings"); }}
        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        Settings
      </button>
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-surface transition-colors flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign out
      </button>
    </div>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted hover:text-text-primary uppercase transition-colors"
      >
        Farm Platform
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && typeof document !== "undefined" && createPortal(userMenuPanel, document.body)}
    </div>
  );
}
