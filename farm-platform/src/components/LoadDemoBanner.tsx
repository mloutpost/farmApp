"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import { fromFirestoreDocument } from "@/lib/farm-serialize";

export default function LoadDemoBanner() {
  const nodes = useFarmStore((s) => s.nodes);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (nodes.length > 0 || dismissed) return null;

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "demo", "farm"));
      if (snap.exists()) {
        const data = fromFirestoreDocument(snap.data() as Record<string, unknown>);
        if (data.nodes?.length) {
          useFarmStore.setState({ nodes: data.nodes as never[] });
        }
        if (data.groups?.length) {
          useFarmStore.setState({ groups: data.groups as never[] });
        }
        if (data.profile && Object.keys(data.profile as object).length > 0) {
          useFarmStore.setState({
            profile: { ...useFarmStore.getState().profile, ...(data.profile as object) },
          });
        }
        useMapStore.getState().setFitToFarmBounds(true);
        setDismissed(true);
      }
    } catch {
      /* offline or no demo data */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-accent/15 border-b border-accent/30 px-4 py-2.5 flex items-center justify-between gap-4">
      <p className="text-sm text-text-primary">
        New here? Load the demo farm to explore.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLoadDemo}
          disabled={loading}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load demo"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-muted hover:text-text-primary text-sm"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
