"use client";

import { useRef, useState } from "react";
import { useBethStore, type BethJournalEntry, type BethJournalPhoto } from "@/store/beth-store";

function RemovePhotoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
import { useFarmStore } from "@/store/farm-store";

function newPhotoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BethJournalPanel() {
  const journalEntries = useBethStore((s) => s.journalEntries);
  const addJournalEntry = useBethStore((s) => s.addJournalEntry);
  const updateJournalEntry = useBethStore((s) => s.updateJournalEntry);
  const removeJournalEntry = useBethStore((s) => s.removeJournalEntry);
  const nodes = useFarmStore((s) => s.nodes);

  const gardenBedNodes = nodes.filter((n) => n.kind === "garden" || n.kind === "bed");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [relatedId, setRelatedId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryTime, setEntryTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const [draftPhotos, setDraftPhotos] = useState<BethJournalPhoto[]>([]);
  const [draftPhotoCaption, setDraftPhotoCaption] = useState("");
  const draftFileRef = useRef<HTMLInputElement>(null);

  /** Caption typed before adding a photo to an existing entry (key = entry id). */
  const [captionForNextByEntry, setCaptionForNextByEntry] = useState<Record<string, string>>({});
  const entryFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const readFileAsPhoto = (file: File, caption?: string): Promise<BethJournalPhoto> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: newPhotoId(),
          dataUrl: reader.result as string,
          caption: caption?.trim() || undefined,
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleDraftFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const photo = await readFileAsPhoto(file, draftPhotoCaption);
      setDraftPhotos((p) => [...p, photo]);
      setDraftPhotoCaption("");
    } finally {
      e.target.value = "";
    }
  };

  const handleEntryFile = (entryId: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cap = captionForNextByEntry[entryId];
    try {
      const photo = await readFileAsPhoto(file, cap);
      const existing =
        useBethStore.getState().journalEntries.find((j) => j.id === entryId)?.photos ?? [];
      updateJournalEntry(entryId, { photos: [...existing, photo] });
      setCaptionForNextByEntry((m) => ({ ...m, [entryId]: "" }));
    } finally {
      e.target.value = "";
    }
  };

  const removeDraftPhoto = (photoId: string) => {
    setDraftPhotos((p) => p.filter((x) => x.id !== photoId));
  };

  const removeEntryPhoto = (entryId: string, photoId: string) => {
    const entry = useBethStore.getState().journalEntries.find((j) => j.id === entryId);
    if (!entry) return;
    updateJournalEntry(entryId, {
      photos: (entry.photos ?? []).filter((p) => p.id !== photoId),
    });
  };

  const updatePhotoCaption = (entryId: string, photoId: string, caption: string) => {
    const entry = useBethStore.getState().journalEntries.find((j) => j.id === entryId);
    if (!entry) return;
    updateJournalEntry(entryId, {
      photos: (entry.photos ?? []).map((p) =>
        p.id === photoId ? { ...p, caption: caption.trim() || undefined } : p
      ),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addJournalEntry({
      date: entryDate,
      time: entryTime,
      title: title.trim() || undefined,
      body: body.trim(),
      relatedNodeId: relatedId || undefined,
      photos: draftPhotos.length ? draftPhotos : undefined,
    });
    setTitle("");
    setBody("");
    setRelatedId("");
    setDraftPhotos([]);
    const d = new Date();
    setEntryDate(d.toISOString().slice(0, 10));
    setEntryTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
  };

  const fieldClass =
    "rounded border border-amber-900/25 bg-white/80 px-3 py-2 text-stone-800 outline-none ring-amber-800/30 focus:ring-2";

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-amber-900/20 bg-[#faf6ef] p-4 shadow-sm"
      >
        <h3 className="mb-3 font-[family-name:var(--font-beth-script)] text-2xl text-stone-800">
          New entry
        </h3>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={`w-full min-h-[44px] ${fieldClass}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Time</label>
            <input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className={`w-full min-h-[44px] ${fieldClass}`}
            />
          </div>
        </div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`mb-3 w-full ${fieldClass}`}
        />
        <label className="block text-sm font-medium text-stone-700 mb-1">Note</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
          className={`mb-3 w-full ${fieldClass}`}
        />

        <div className="mb-3 rounded-md border border-amber-900/15 bg-white/50 p-3">
          <p className="text-sm font-medium text-stone-700 mb-2">Pictures</p>
          <input
            ref={draftFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleDraftFile}
            className="hidden"
          />
          <div className="flex flex-wrap items-end gap-2 mb-2">
            <input
              type="text"
              value={draftPhotoCaption}
              onChange={(e) => setDraftPhotoCaption(e.target.value)}
              placeholder="Caption for next photo (optional)"
              className={`flex-1 min-w-[12rem] ${fieldClass}`}
            />
            <button
              type="button"
              onClick={() => draftFileRef.current?.click()}
              className="min-h-[44px] rounded-md border border-amber-900/40 px-3 py-2 text-sm text-amber-950 hover:bg-amber-900/10"
            >
              Add picture
            </button>
          </div>
          {draftPhotos.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {draftPhotos.map((p) => (
                <li key={p.id} className="relative group rounded-lg overflow-hidden border border-amber-900/20">
                  <img
                    src={p.dataUrl}
                    alt={p.caption || "Attached photo"}
                    className="w-full h-28 object-cover"
                  />
                  {p.caption && (
                    <p className="text-xs text-stone-600 px-1 py-0.5 truncate bg-[#fffdf8]">{p.caption}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDraftPhoto(p.id)}
                    className="absolute top-1 right-1 rounded bg-black/55 p-1.5 text-white min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label="Remove picture"
                  >
                    <RemovePhotoIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="block text-sm font-medium text-stone-700 mb-1">
          Related garden or bed (optional)
        </label>
        <select
          value={relatedId}
          onChange={(e) => setRelatedId(e.target.value)}
          className={`mb-4 w-full ${fieldClass}`}
        >
          <option value="">None</option>
          {gardenBedNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.kind === "garden" ? "Garden" : "Bed"}: {n.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-800 min-h-[44px]"
        >
          Save to journal
        </button>
      </form>

      <ul className="space-y-4">
        {journalEntries.map((e: BethJournalEntry) => (
          <li
            key={e.id}
            className="rounded-lg border border-amber-900/15 bg-[#fffdf8] p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  {e.date}
                  {e.time ? ` · ${e.time}` : ""}
                </p>
                {e.title && (
                  <h4 className="font-[family-name:var(--font-beth-serif)] text-lg text-stone-900">
                    {e.title}
                  </h4>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeJournalEntry(e.id)}
                className="text-sm text-stone-500 hover:text-red-800 min-h-[44px] min-w-[44px] px-2"
              >
                Remove
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-beth-script)] text-xl leading-relaxed text-stone-800">
              {e.body}
            </p>

            {(e.photos?.length ?? 0) > 0 && (
              <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(e.photos ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg overflow-hidden border border-amber-900/15 bg-[#faf6ef]"
                  >
                    <img
                      src={p.dataUrl}
                      alt={p.caption || "Journal photo"}
                      className="w-full h-32 object-cover"
                    />
                    {p.caption && (
                      <p className="text-xs text-stone-600 px-2 py-1 border-t border-amber-900/10">
                        {p.caption}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {e.relatedNodeId && (
              <p className="mt-2 text-sm text-stone-600">
                Linked: {nodes.find((n) => n.id === e.relatedNodeId)?.name ?? e.relatedNodeId}
              </p>
            )}
            <details className="mt-2 text-sm text-stone-600">
              <summary className="cursor-pointer">Edit</summary>
              <div className="mt-2 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-stone-500">Date</label>
                    <input
                      type="date"
                      value={e.date}
                      onChange={(ev) => updateJournalEntry(e.id, { date: ev.target.value })}
                      className="mt-0.5 w-full rounded border border-amber-900/20 px-2 py-1 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Time</label>
                    <input
                      type="time"
                      value={e.time ?? ""}
                      onChange={(ev) =>
                        updateJournalEntry(e.id, { time: ev.target.value || undefined })
                      }
                      className="mt-0.5 w-full rounded border border-amber-900/20 px-2 py-1 text-stone-900"
                    />
                  </div>
                </div>
                <input
                  value={e.title ?? ""}
                  onChange={(ev) => updateJournalEntry(e.id, { title: ev.target.value || undefined })}
                  placeholder="Title"
                  className="w-full rounded border border-amber-900/20 px-2 py-1"
                />
                <textarea
                  value={e.body}
                  onChange={(ev) => updateJournalEntry(e.id, { body: ev.target.value })}
                  rows={4}
                  className="w-full rounded border border-amber-900/20 px-2 py-1"
                />

                <div className="rounded-md border border-amber-900/15 bg-amber-900/5 p-2">
                  <p className="text-xs font-medium text-stone-700 mb-2">Pictures</p>
                  <input
                    ref={(el) => {
                      entryFileRefs.current[e.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleEntryFile(e.id)}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="text"
                      value={captionForNextByEntry[e.id] ?? ""}
                      onChange={(ev) =>
                        setCaptionForNextByEntry((m) => ({ ...m, [e.id]: ev.target.value }))
                      }
                      placeholder="Caption for next photo"
                      className="flex-1 min-w-[8rem] rounded border border-amber-900/20 px-2 py-1 text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => entryFileRefs.current[e.id]?.click()}
                      className="rounded border border-amber-900/40 px-2 py-1 text-sm text-amber-950 min-h-[44px]"
                    >
                      Add picture
                    </button>
                  </div>
                  {(e.photos?.length ?? 0) > 0 && (
                    <ul className="mt-2 space-y-2">
                      {(e.photos ?? []).map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap gap-2 items-start rounded border border-amber-900/10 p-2 bg-[#fffdf8]"
                        >
                          <img
                            src={p.dataUrl}
                            alt=""
                            className="w-16 h-16 object-cover rounded shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={p.caption ?? ""}
                              onChange={(ev) =>
                                updatePhotoCaption(e.id, p.id, ev.target.value)
                              }
                              placeholder="Caption"
                              className="w-full text-sm rounded border border-amber-900/20 px-2 py-1"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEntryPhoto(e.id, p.id)}
                            className="text-xs text-red-800 hover:underline min-h-[44px] px-2"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
