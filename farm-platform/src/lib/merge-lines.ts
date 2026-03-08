/**
 * Merge connected LineString segments into continuous polylines.
 *
 * Takes an array of LineString coordinate arrays ([lng, lat][]) and stitches
 * segments whose endpoints are within `tolerance` degrees of each other into
 * longer continuous lines.
 */

const DEFAULT_TOLERANCE = 0.00005; // ~5 meters at mid-latitudes

function ptKey(coord: number[], tol: number): string {
  const factor = 1 / tol;
  return `${Math.round(coord[0] * factor)},${Math.round(coord[1] * factor)}`;
}

function dist2(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

interface Segment {
  coords: number[][];
  used: boolean;
}

export function mergeLineSegments(
  lines: number[][][],
  tolerance = DEFAULT_TOLERANCE,
): number[][][] {
  if (!lines?.length) return [];
  if (lines.length <= 1) return lines;

  const segments: Segment[] = lines
    .filter((coords): coords is number[][] => Array.isArray(coords) && coords.length >= 2)
    .map((coords) => ({
      coords,
      used: false,
    }));

  if (segments.length === 0) return [];

  const tol2 = tolerance * tolerance;

  const endpointIndex = new Map<string, number[]>();
  segments.forEach((seg, i) => {
    const startKey = ptKey(seg.coords[0], tolerance);
    const endKey = ptKey(seg.coords[seg.coords.length - 1], tolerance);
    for (const key of [startKey, endKey]) {
      let list = endpointIndex.get(key);
      if (!list) { list = []; endpointIndex.set(key, list); }
      list.push(i);
    }
  });

  function findConnected(point: number[], excludeIdx: number): number | null {
    const key = ptKey(point, tolerance);
    const candidates = endpointIndex.get(key);
    if (!candidates) return null;
    let bestIdx: number | null = null;
    let bestDist = Infinity;
    for (const idx of candidates) {
      if (idx === excludeIdx || segments[idx].used) continue;
      const seg = segments[idx];
      const dStart = dist2(point, seg.coords[0]);
      const dEnd = dist2(point, seg.coords[seg.coords.length - 1]);
      const d = Math.min(dStart, dEnd);
      if (d < tol2 && d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  const merged: number[][][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].used) continue;
    segments[i].used = true;
    let chain = [...segments[i].coords];

    let growing = true;
    while (growing) {
      growing = false;

      const tail = chain[chain.length - 1];
      const tailMatch = findConnected(tail, -1);
      if (tailMatch !== null) {
        const seg = segments[tailMatch];
        seg.used = true;
        const dStart = dist2(tail, seg.coords[0]);
        const dEnd = dist2(tail, seg.coords[seg.coords.length - 1]);
        if (dStart <= dEnd) {
          chain = chain.concat(seg.coords.slice(1));
        } else {
          chain = chain.concat([...seg.coords].reverse().slice(1));
        }
        growing = true;
      }

      const head = chain[0];
      const headMatch = findConnected(head, -1);
      if (headMatch !== null) {
        const seg = segments[headMatch];
        seg.used = true;
        const dStart = dist2(head, seg.coords[0]);
        const dEnd = dist2(head, seg.coords[seg.coords.length - 1]);
        if (dEnd <= dStart) {
          chain = seg.coords.concat(chain.slice(1));
        } else {
          chain = [...seg.coords].reverse().concat(chain.slice(1));
        }
        growing = true;
      }
    }

    merged.push(chain);
  }

  return merged;
}
