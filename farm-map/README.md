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

Visit the printed URL (default `http://localhost:5173`) and you will see an interactive globe-inspired map with navigation, scale, geolocation controls, and a draggable command panel.

## Sketching or Importing Farm Boundaries

- Use the **Draw**/**Finish** buttons (or the Mapbox Draw polygon tool) inside the floating panel to sketch acreage directly on the map.
- Click **Upload GeoJSON** and drop in `*.geojson` / `*.json` exports from QGIS, ArcGIS, etc.
- After each action the camera auto-fits, the CLI ticker along the bottom summarizes the action, and you can drag the panel to any corner.
- Customize the boundary styling live via the panel (fill color/opacity, line color/width).

## UI Additions

- Three-second welcome splash (`Welcome to FarmScout`) on initial load.
- Draggable boundary command panel that shows camera info and controls drawing/importing/styling.
- Terminal-style ticker anchored to the bottom that streams the latest activity message.

## Next Steps

- Import your QGIS GeoJSON layers and draw them as custom MapLibre sources.
- Add farm-specific overlays (plantings, soil tests, scouting notes) via React panels.
- Connect to an API (AppSync, API Gateway, or FastAPI) for persistence and analytics.
