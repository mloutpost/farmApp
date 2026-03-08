"use client";

import { useRef, useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode } from "@/types";

export default function PhotoGallery({ node }: { node: FarmNode }) {
  const addPhoto = useFarmStore((s) => s.addPhoto);
  const removePhoto = useFarmStore((s) => s.removePhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addPhoto(node.id, {
        date: new Date().toISOString().split("T")[0],
        dataUrl,
        caption: caption || undefined,
      });
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Photos</h3>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          + Add Photo
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption for next photo (optional)"
          className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-muted"
        />
      </div>

      {node.photos.length === 0 ? (
        <p className="text-xs text-text-muted">No photos yet. Take a photo to document progress.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {node.photos.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={p.dataUrl} alt={p.caption ?? "Farm photo"} className="w-full h-24 object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className="text-[10px] text-white/90">{p.date}</span>
                {p.caption && <span className="text-[10px] text-white/70 ml-1">{p.caption}</span>}
              </div>
              <button
                onClick={() => removePhoto(node.id, p.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 rounded bg-black/50 p-1 text-white transition-opacity"
                aria-label="Remove photo"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
