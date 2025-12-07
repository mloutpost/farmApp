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

Visit the printed URL (default `http://localhost:5173`) and you will see an interactive globe-inspired map with scale/geolocation controls, a draggable command panel, and HUD elements inspired by Windy/MarineTraffic.

## Sketching or Importing Farm Boundaries

- Use the **My Farm** tab to upload `*.geojson` / `*.json` exports or capture a sketch with the MapLibre draw mode, then **Save sketch** to convert it into a managed layer.
- Each upload becomes its own layer entry; click any layer to adjust fill/line colors, opacity, or stroke width, or delete it entirely.
- A one-line CLI ticker summarizes every action, while the live latitude/longitude badge in the upper-right mirrors pro weather UIs.

## UI Additions

- Three-second welcome splash (`Welcome to FarmScout`) on initial load.
- Draggable multi-tab command panel:
  - **My Farm** – upload GeoJSON, manage sketches, prep future telemetry widgets.
  - **Layers** – view a running list of uploaded/saved layers, edit style, delete entries.
  - **Settings** – toggle Miles/Km, switch dark/light/system theme, or flip between cartographic and satellite basemaps.
- Terminal-style ticker anchored to the bottom that streams the latest activity message.
- Coordinate badge in the upper-right plus a four-way pan indicator in place of the default MapLibre controls.

## Next Steps

- Import your QGIS GeoJSON layers and draw them as custom MapLibre sources.
- Add farm-specific overlays (plantings, soil tests, scouting notes) via React panels.
- Connect to an API (AppSync, API Gateway, or FastAPI) for persistence and analytics.
