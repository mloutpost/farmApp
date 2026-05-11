"use client";

import type { DocumentData } from "firebase/firestore";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LiturgicalYearEntry } from "@/store/liturgical-year-store";

/**
 * Firestore layout (per user):
 *   users/{uid}/liturgicalYear/{YYYY-MM-DD}
 *
 * The TV dashboard subscribes to this collection so the morning email
 * (written by either the feed UI or the import-liturgical-email script)
 * shows up automatically.
 */

const SUBCOLLECTION = "liturgicalYear";

function entryDocRef(uid: string, date: string) {
  return doc(db, "users", uid, SUBCOLLECTION, date);
}

export async function saveLiturgicalEntryToFirestore(
  uid: string,
  entry: LiturgicalYearEntry
): Promise<void> {
  const payload: DocumentData = {
    date: entry.date,
    updatedAt: entry.updatedAt,
  };
  if (entry.title) payload.title = entry.title;
  if (entry.feast) payload.feast = entry.feast;
  if (entry.season) payload.season = entry.season;
  if (entry.reflection) payload.reflection = entry.reflection;
  if (entry.reflectionLatin) payload.reflectionLatin = entry.reflectionLatin;
  if (entry.collect) payload.collect = entry.collect;
  if (entry.collectLatin) payload.collectLatin = entry.collectLatin;
  if (entry.readings) payload.readings = entry.readings;
  if (entry.readingsLatin) payload.readingsLatin = entry.readingsLatin;
  if (entry.quote) payload.quote = entry.quote;
  if (entry.raw) payload.raw = entry.raw;
  if (entry.source) payload.source = entry.source;
  if (entry.commemorations !== undefined) {
    payload.commemorations = entry.commemorations;
  }
  await setDoc(entryDocRef(uid, entry.date), payload, { merge: true });
}

export async function deleteLiturgicalEntryFromFirestore(
  uid: string,
  date: string
): Promise<void> {
  await deleteDoc(entryDocRef(uid, date));
}

/**
 * Subscribe to all entries for a user. Returns the unsubscribe function.
 * The callback fires once with the current state and again on every change.
 */
export function subscribeLiturgicalEntries(
  uid: string,
  onEntries: (entries: LiturgicalYearEntry[]) => void
): () => void {
  const col = collection(db, "users", uid, SUBCOLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const list: LiturgicalYearEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<LiturgicalYearEntry>;
        if (data?.date) {
          list.push({
            date: data.date,
            title: data.title,
            feast: data.feast,
            season: data.season,
            commemorations: Array.isArray(data.commemorations)
              ? data.commemorations.filter((x): x is string => typeof x === "string")
              : undefined,
            reflection: data.reflection,
            reflectionLatin: data.reflectionLatin,
            collect: data.collect,
            collectLatin: data.collectLatin,
            readings: data.readings,
            readingsLatin: data.readingsLatin,
            quote: data.quote,
            raw: data.raw,
            source: data.source,
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          });
        }
      });
      onEntries(list);
    },
    () => {
      /* permission / offline — local store still works */
    }
  );
}
