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

Visit the printed URL (default `http://localhost:5173`) and you will see an interactive globe-inspired map with navigation, scale, and geolocation controls.

## Next Steps

- Import your QGIS layers (GeoJSON/Shapefile) and draw them as custom MapLibre sources.
- Add farm-specific overlays (plantings, soil tests, scouting notes) via React panels.
- Connect to an API (AppSync, API Gateway, or FastAPI) for persistence and analytics.
