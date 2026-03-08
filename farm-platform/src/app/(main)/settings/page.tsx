"use client";

import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFarmStore } from "@/store/farm-store";
import { useAuth } from "@/hooks/useAuth";
import SurveyImport from "@/components/settings/SurveyImport";
import GeoJsonNodeImport from "@/components/settings/GeoJsonNodeImport";
import AddressSearch from "@/components/settings/AddressSearch";
import { toFirestoreDocument, fromFirestoreDocument } from "@/lib/farm-serialize";

export default function SettingsPage() {
  const profile = useFarmStore((s) => s.profile);
  const updateProfile = useFarmStore((s) => s.updateProfile);
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const { user, loading: authLoading } = useAuth();
  const [demoSaveStatus, setDemoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [demoSaveError, setDemoSaveError] = useState<string | null>(null);
  const [demoLoadStatus, setDemoLoadStatus] = useState<"idle" | "loading" | "loaded" | "error" | "empty">("idle");

  const handleSaveAsDemo = async () => {
    if (!user) {
      setDemoSaveError("Sign in required. Use the Sign in button in the top right.");
      setDemoSaveStatus("error");
      setTimeout(() => { setDemoSaveStatus("idle"); setDemoSaveError(null); }, 5000);
      return;
    }
    setDemoSaveStatus("saving");
    setDemoSaveError(null);
    try {
      const docData = toFirestoreDocument({ nodes, groups, profile });
      await setDoc(doc(db, "demo", "farm"), docData);
      setDemoSaveStatus("saved");
      setTimeout(() => setDemoSaveStatus("idle"), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      setDemoSaveError(msg);
      setDemoSaveStatus("error");
      setTimeout(() => { setDemoSaveStatus("idle"); setDemoSaveError(null); }, 5000);
    }
  };

  const handleLoadDemo = async () => {
    setDemoLoadStatus("loading");
    try {
      const snap = await getDoc(doc(db, "demo", "farm"));
      if (!snap.exists()) {
        setDemoLoadStatus("empty");
        setTimeout(() => setDemoLoadStatus("idle"), 2000);
        return;
      }
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
      setDemoLoadStatus("loaded");
      setTimeout(() => setDemoLoadStatus("idle"), 2000);
    } catch {
      setDemoLoadStatus("error");
      setTimeout(() => setDemoLoadStatus("idle"), 3000);
    }
  };

  const handleFullExport = () => {
    const payload = { profile, nodes, exportedAt: new Date().toISOString() };
    const csv = JSON.stringify(payload, null, 2);
    const blob = new Blob([csv], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name.replace(/\s+/g, "_")}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Configure your farm profile and import data.</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="text-base font-medium text-text-primary mb-4">Farm Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Farm Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div className="col-span-2">
                <AddressSearch />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Latitude</label>
                <input
                  type="number"
                  value={profile.locationLat ?? ""}
                  onChange={(e) => updateProfile({ locationLat: e.target.value ? Number(e.target.value) : undefined })}
                  step="0.0001"
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Longitude</label>
                <input
                  type="number"
                  value={profile.locationLng ?? ""}
                  onChange={(e) => updateProfile({ locationLng: e.target.value ? Number(e.target.value) : undefined })}
                  step="0.0001"
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Hardiness Zone
                  {profile.hardinessZone && <span className="ml-1 text-text-muted font-normal">(auto-detected)</span>}
                </label>
                <input
                  type="text"
                  value={profile.hardinessZone ?? ""}
                  onChange={(e) => updateProfile({ hardinessZone: e.target.value })}
                  placeholder="Set location to auto-detect"
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Sun Exposure
                  {profile.sunDataSource && <span className="ml-1 text-text-muted font-normal">({profile.sunDataSource})</span>}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={profile.sunshineHoursPerYear != null ? `${profile.sunshineHoursPerYear} hrs/yr` : ""}
                    readOnly
                    placeholder="Set location to auto-detect"
                    className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                  {profile.sunExposure && (
                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                      profile.sunExposure === "full" ? "bg-yellow-500/15 text-yellow-600" :
                      profile.sunExposure === "partial" ? "bg-orange-500/15 text-orange-500" :
                      "bg-slate-500/15 text-slate-500"
                    }`}>
                      {profile.sunExposure}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Current Season</label>
                <input
                  type="number"
                  value={profile.currentSeason ?? new Date().getFullYear()}
                  onChange={(e) => updateProfile({ currentSeason: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Last Frost (Spring)</label>
                <input
                  type="date"
                  value={profile.lastFrostSpring ?? ""}
                  onChange={(e) => updateProfile({ lastFrostSpring: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">First Frost (Fall)</label>
                <input
                  type="date"
                  value={profile.firstFrostFall ?? ""}
                  onChange={(e) => updateProfile({ firstFrostFall: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="text-base font-medium text-text-primary mb-1">Import GeoJSON as Nodes</h2>
            <p className="text-sm text-text-muted mb-6">
              Import a GeoJSON file to create farm nodes. Each feature becomes a garden, field, pasture, or other node you can manage.
            </p>
            <GeoJsonNodeImport />
          </section>

          <section className="rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="text-base font-medium text-text-primary mb-1">Survey Overlay Import</h2>
            <p className="text-sm text-text-muted mb-6">Import DXF or GeoJSON as a visual map layer (not editable nodes).</p>
            <SurveyImport />
          </section>

          <section className="rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="text-base font-medium text-text-primary mb-2">Data Export</h2>
            <p className="text-sm text-text-muted mb-4">Export all farm data for backup or migration.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleFullExport}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
              >
                Export Full Farm Data
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-bg-elevated p-6">
            <h2 className="text-base font-medium text-text-primary mb-1">Demo data</h2>
            <p className="text-sm text-text-muted mb-4">
              Save your current farm as demo data. New users can load it to explore the app without starting from scratch.
            </p>
            {demoSaveError && (
              <p className="text-sm text-danger mb-3">{demoSaveError}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveAsDemo}
                disabled={demoSaveStatus === "saving" || nodes.length === 0 || authLoading}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {demoSaveStatus === "saving" || demoSaveStatus === "idle"
                  ? "Save as demo data"
                  : demoSaveStatus === "saved"
                    ? "Saved"
                    : "Error – try again"}
              </button>
              <button
                onClick={handleLoadDemo}
                disabled={demoLoadStatus === "loading"}
                className="rounded-md border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-50"
              >
                {demoLoadStatus === "loading"
                  ? "Loading…"
                  : demoLoadStatus === "loaded"
                    ? "Loaded"
                    : demoLoadStatus === "empty"
                      ? "No demo yet"
                      : demoLoadStatus === "error"
                        ? "Error"
                        : "Load demo farm"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
