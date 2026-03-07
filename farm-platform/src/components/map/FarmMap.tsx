"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { useMapStore } from "@/store/map-store";
import { getGeoJsonBounds } from "@/lib/coordinate-transform";
import { useGoogleMapsApiKey } from "@/hooks/useGoogleMapsApiKey";
import type { FeatureCollection } from "geojson";

function MapLayers({ map }: { map: google.maps.Map | null }) {
  const layers = useMapStore((s) => s.layers);
  const fitToLayerId = useMapStore((s) => s.fitToLayerId);
  const setFitToLayerId = useMapStore((s) => s.setFitToLayerId);

  useEffect(() => {
    if (!map) return;

    const data = map.data;
    if (!data) return;

    const toRemove: google.maps.Data.Feature[] = [];
    data.forEach((f) => {
      if (f.getProperty?.("layerId")) toRemove.push(f);
    });
    toRemove.forEach((f) => data.remove(f));

    layers.forEach((layer) => {
      if (!layer.visible || !layer.geojson) return;
      try {
        const geojson = layer.geojson as FeatureCollection;
        if (geojson.type !== "FeatureCollection" || !geojson.features) return;

        const features = geojson.features.map((f) => ({
          ...f,
          properties: { ...f.properties, layerId: layer.id },
        }));
        data.addGeoJson({ type: "FeatureCollection", features } as FeatureCollection);

        if (fitToLayerId === layer.id) {
          const bounds = getGeoJsonBounds(geojson);
          if (bounds) {
            const [minLng, minLat, maxLng, maxLat] = bounds;
            map.fitBounds(
              { east: maxLng, west: minLng, north: maxLat, south: minLat },
              40
            );
            setFitToLayerId(null);
          }
        }
      } catch {
        // Ignore invalid GeoJSON
      }
    });

    data.setStyle((f) => {
      const layerId = f.getProperty?.("layerId");
      const layer = layers.find((l) => l.id === layerId);
      const opacity = layer ? layer.opacity * (layer.visible ? 1 : 0) : 0;
      const geom = f.getGeometry?.();
      const isPolygon =
        geom?.getType?.() === "Polygon" || geom?.getType?.() === "MultiPolygon";

      return {
        fillColor: layer?.type === "boundary" ? "#22c55e" : "#7dd3fc",
        fillOpacity: isPolygon ? opacity * 0.35 : 0,
        strokeColor: "#94a3b8",
        strokeOpacity: opacity,
        strokeWeight: 1.5,
      };
    });
  }, [map, layers, fitToLayerId, setFitToLayerId]);

  return null;
}

function MapWithLayers() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const {
    mapType,
    center,
    zoom,
    setCenter,
    setZoom,
    mapMarkers,
    setSelectedMapNode,
  } = useMapStore();

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const onIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter?.();
    if (c) setCenter([c.lng(), c.lat()]);
    const z = map.getZoom?.();
    if (z != null) setZoom(z);
  }, [setCenter, setZoom]);

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={{ lat: center[1], lng: center[0] }}
      zoom={zoom}
      mapTypeId={mapType}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={onIdle}
      options={{
        mapTypeControl: true,
        mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        scaleControl: true,
      }}
    >
      {mapReady && <MapLayers map={mapRef.current} />}
      {mapMarkers.map((m) => (
        <Marker
          key={m.id}
          position={{ lat: m.lat, lng: m.lng }}
          title={m.name}
          onClick={() => setSelectedMapNode(m.id)}
          options={{
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: "#22c55e",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          }}
        />
      ))}
    </GoogleMap>
  );
}

export default function FarmMap() {
  const { key: apiKey, loading } = useGoogleMapsApiKey();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-text-secondary">Loading map...</span>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
        <div className="text-center max-w-md px-6">
          <div className="mb-4 text-4xl">🗺️</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Google Maps API Key Required
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Add your Google Maps API key to{" "}
            <code className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">
              .env.local
            </code>{" "}
            as <code className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>
          </p>
          <p className="text-text-muted text-xs mt-3">
            Enable Maps JavaScript API at{" "}
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript id="google-maps-script" googleMapsApiKey={apiKey} loadingElement={<div className="h-full w-full flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" /></div>}>
      <MapWithLayers />
    </LoadScript>
  );
}
