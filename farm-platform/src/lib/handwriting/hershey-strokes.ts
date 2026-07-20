/**
 * Browser-safe Hershey Roman Simplex single-stroke font (MIT, bjnortier/hershey).
 * Decodes font data with atob — no Node Buffer required.
 */

import ROWMANS_B64 from "hershey/lib/rowmans.js";

export interface HersheyBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface HersheyPathsResult {
  bounds: HersheyBounds;
  paths: [number, number][][];
}

const CHARACTER_NUMBERS: Record<string, number> = {
  A: 501, B: 502, C: 503, D: 504, E: 505, F: 506, G: 507, H: 508, I: 509, J: 510,
  K: 511, L: 512, M: 513, N: 514, O: 515, P: 516, Q: 517, R: 518, S: 519, T: 520,
  U: 521, V: 522, W: 523, X: 524, Y: 525, Z: 526,
  a: 601, b: 602, c: 603, d: 604, e: 605, f: 606, g: 607, h: 608, i: 609, j: 610,
  k: 611, l: 612, m: 613, n: 614, o: 615, p: 616, q: 617, r: 618, s: 619, t: 620,
  u: 621, v: 622, w: 623, x: 624, y: 625, z: 626,
  " ": 699,
  "0": 700, "1": 701, "2": 702, "3": 703, "4": 704, "5": 705, "6": 706, "7": 707, "8": 708, "9": 709,
  ".": 710, ",": 711, ":": 712, ";": 713, "!": 714, "?": 715, '"': 717, "°": 718, $: 719, "/": 720,
  "(": 721, ")": 722, "|": 723, "-": 724, "+": 725, "=": 726, "'": 731, "#": 733, "&": 734,
  "\\": 804, _: 999, "*": 2219, "[": 2223, "]": 2224, "{": 2225, "}": 2226, "<": 2241, ">": 2242,
  "~": 2246, "%": 2271, "@": 2273,
};

interface CharacterDescriptor {
  number: number;
  left: number;
  right: number;
  penCommands: [number, number][][];
}

function parseCharacterDescriptor(descriptor: string): CharacterDescriptor {
  const R = "R".charCodeAt(0);
  const number = parseInt(descriptor.substr(0, 5), 10);
  const left = descriptor.charCodeAt(8) - R;
  const right = descriptor.charCodeAt(9) - R;
  const numVertices = parseInt(descriptor.substr(5, 3), 10) - 1;
  const penCommands: [number, number][][] = [];
  let currentPath: [number, number][] = [];
  penCommands.push(currentPath);

  for (let i = 0; i < numVertices; i++) {
    const x = descriptor.charCodeAt(10 + i * 2) - R;
    const y = descriptor.charCodeAt(11 + i * 2) - R;
    if (x === -50 && y === 0) {
      currentPath = [];
      penCommands.push(currentPath);
    } else {
      currentPath.push([x, y]);
    }
  }

  return { number, left, right, penCommands };
}

function decodeRowmans(): Record<number, CharacterDescriptor> {
  const b64 =
    typeof ROWMANS_B64 === "string"
      ? ROWMANS_B64
      : (ROWMANS_B64 as { default: string }).default;
  const ascii = atob(b64);
  const map: Record<number, CharacterDescriptor> = {};
  for (const line of ascii.split("\n")) {
    if (!line.trim()) continue;
    const descriptor = parseCharacterDescriptor(line);
    map[descriptor.number] = descriptor;
  }
  return map;
}

const rowmans = decodeRowmans();

/** Roman Simplex lowercase body sits on font y=9; descenders reach y=16. */
export const HERSHEY_FONT_BASELINE = 9;

function descriptorForChar(char: string): CharacterDescriptor {
  const characterNumber = CHARACTER_NUMBERS[char];
  return rowmans[characterNumber] ?? rowmans[CHARACTER_NUMBERS[" "]]!;
}

/** Left-aligned paths in em units: x≥0, baseline at y=0, y grows down (SVG-like). */
export function charStrokePaths(char: string): {
  paths: [number, number][][];
  advance: number;
} {
  const descriptor = descriptorForChar(char);
  const paths = descriptor.penCommands.map((command) =>
    command.map(
      ([fx, fy]) =>
        [fx - descriptor.left, fy - HERSHEY_FONT_BASELINE] as [number, number]
    )
  );
  return { paths, advance: descriptor.right - descriptor.left };
}

export function charAdvanceUnits(char: string): number {
  const descriptor = descriptorForChar(char);
  return descriptor.right - descriptor.left;
}

export function stringToPaths(string: string): HersheyPathsResult {
  if (!string.length) {
    return { bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, paths: [] };
  }

  const spaceDescriptor = rowmans[CHARACTER_NUMBERS[" "]]!;
  const characterDescriptors = string.split("").map((character) => {
    const characterNumber = CHARACTER_NUMBERS[character];
    return rowmans[characterNumber] ?? spaceDescriptor;
  });

  const bounds = characterDescriptors.reduce(
    (acc, descriptor) => {
      acc.width += descriptor.right - descriptor.left;
      for (const command of descriptor.penCommands) {
        for (const point of command) {
          const ly = point[1] - HERSHEY_FONT_BASELINE;
          acc.minY = Math.min(acc.minY, ly);
          acc.maxY = Math.max(acc.maxY, ly);
        }
      }
      return acc;
    },
    { width: 0, minY: Infinity, maxY: -Infinity }
  );

  const minX = -bounds.width / 2;
  const maxX = bounds.width / 2;
  const minY = bounds.minY;
  const maxY = bounds.maxY;

  let paths: [number, number][][] = [];
  let currentX = minX;

  for (const descriptor of characterDescriptors) {
    const charPaths = descriptor.penCommands.map((command) =>
      command.map(
        (point) =>
          [
            currentX - descriptor.left + point[0],
            point[1] - HERSHEY_FONT_BASELINE,
          ] as [number, number]
      )
    );
    paths = paths.concat(charPaths);
    currentX += descriptor.right - descriptor.left;
  }

  return { bounds: { minX, maxX, minY, maxY }, paths };
}
