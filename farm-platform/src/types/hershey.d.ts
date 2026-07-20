declare module "hershey/lib/rowmans.js" {
  const rowmansB64: string;
  export default rowmansB64;
}

declare module "hershey" {
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

  export function stringToPaths(text: string): HersheyPathsResult;
}
