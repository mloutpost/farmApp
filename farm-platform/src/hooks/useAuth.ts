"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth)
      .then(() => {
        /* result applied via onAuthStateChanged */
      })
      .catch(() => {
        /* ignore – user may have cancelled */
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
