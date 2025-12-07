# Farm Scout Base Map

This repository bootstraps a lightweight, Windy-style map canvas where you can begin plotting fields, equipment paths, and yield layers for your farm.

## Stack

- [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript
- [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) with Carto's Voyager basemap
- Modern HUD overlay components ready for acreage, planting, or telemetry metadata

## Getting Started

```bash
npm install
npm run dev
```

Visit the printed URL (default `http://localhost:5173`) and you will see an interactive globe-inspired map with geolocation controls, a draggable command panel, and a Windy-style HUD banner that streams timestamped CLI updates on the left and live latitude/longitude on the right.

## Sketching or Importing Farm Boundaries

- Use the **Layers** tab to upload `*.geojson` / `*.json` exports (now resilient to newline-delimited GeoJSON) or capture a sketch with MapLibre draw mode, then **Save sketch** to convert it into a managed layer.
- Each upload becomes its own layer entry; click it to zoom/expand an inline style panel, double-click to rename, hover (500 ms) for a stats popover, then fine-tune fill/line colors, opacity, stroke width, or hatching (solid/diagonal/cross).
- Hovering over either the layer list or the map itself (for 500 ms) reveals configurable metadata cards so you can inspect acreage/crop details without opening another panel.

## UI Additions

- 1.5-second welcome splash (`Welcome to FarmScout`) on initial load.
- Draggable multi-tab command panel:
  - **My Farm** – sketch helpers reserved for upcoming agronomic widgets.
  - **Layers** – intake GeoJSON, convert sketches, manage/rename layers, hover for stats, tweak styling (including hatch patterns), delete entries.
  - **Settings** – toggle Miles/Km, switch dark/light/system theme, flip between cartographic and satellite basemaps, and configure which feature properties appear on hover.
  - **Camera** – lock the camera to north-up (default) or free mode and register Reolink streams with GPS coordinates so camera icons/popup links appear directly on the map.
- Status banner pinned to the top keeps timestamped CLI output left-aligned while right-aligning lat/long, ensuring MapLibre overlays never collide with the HUD.

## Next Steps

- Import your QGIS GeoJSON layers and draw them as custom MapLibre sources.
- Add farm-specific overlays (plantings, soil tests, scouting notes) via React panels.
- Connect to an API (AppSync, API Gateway, or FastAPI) for persistence and analytics.
