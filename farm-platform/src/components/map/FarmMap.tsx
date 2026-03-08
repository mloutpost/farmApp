"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import { getGeoJsonBounds } from "@/lib/coordinate-transform";
import { useGoogleMapsApiKey } from "@/hooks/useGoogleMapsApiKey";
import { MapProvider, useSetMap } from "@/contexts/MapContext";
import { MapDrawingHandler } from "./MapDrawingHandler";
import DrawingOverlay from "./DrawingOverlay";
import PolygonEditor from "./PolygonEditor";
import { NODE_KIND_COLORS } from "@/types";
import type { FeatureCollection } from "geojson";

function MapLayers({ map }: { map: google.maps.Map | null }) {
  const router = useRouter();
  const layers = useMapStore((s) => s.layers);
  const fitToLayerId = useMapStore((s) => s.fitToLayerId);
  const setFitToLayerId = useMapStore((s) => s.setFitToLayerId);
  const editingNodeId = useMapStore((s) => s.editingNodeId);
  const setEditingNodeId = useMapStore((s) => s.setEditingNodeId);
  const drawMode = useMapStore((s) => s.drawMode);

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
            map.fitBounds({ east: maxLng, west: minLng, north: maxLat, south: minLat }, 40);
            setFitToLayerId(null);
          }
        }
      } catch {
        /* skip invalid geojson */
      }
    });

    data.setStyle((f) => {
      const kind = f.getProperty?.("kind") as string | undefined;
      const nodeId = f.getProperty?.("nodeId") as string | undefined;
      const layerId = f.getProperty?.("layerId");
      const layer = layers.find((l) => l.id === layerId);
      const opacity = layer ? layer.opacity * (layer.visible ? 1 : 0) : 0;
      const geom = f.getGeometry?.();
      const isPolygon = geom?.getType?.() === "Polygon" || geom?.getType?.() === "MultiPolygon";
      const customColor = f.getProperty?.("color") as string | undefined;
      const color = customColor || (kind ? (NODE_KIND_COLORS as Record<string, string>)[kind] ?? "#22c55e" : "#22c55e");

      if (nodeId && nodeId === editingNodeId) {
        return { visible: false };
      }

      return {
        fillColor: color,
        fillOpacity: isPolygon ? opacity * 0.3 : 0,
        strokeColor: color,
        strokeOpacity: opacity,
        strokeWeight: 2,
      };
    });

    const clickHandler = data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      if (drawMode !== "none") return;
      const nodeId = e.feature.getProperty?.("nodeId") as string | undefined;
      if (typeof nodeId === "string") {
        setEditingNodeId(nodeId);
      }
    });

    return () => {
      google.maps.event.removeListener(clickHandler);
    };
  }, [map, layers, fitToLayerId, setFitToLayerId, router, editingNodeId, setEditingNodeId, drawMode]);

  return null;
}

function MapWithLayers() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const setMap = useSetMap();
  const mapType = useMapStore((s) => s.mapType);
  const mapMarkers = useMapStore((s) => s.mapMarkers);
  const editingNodeId = useMapStore((s) => s.editingNodeId);
  const setEditingNodeId = useMapStore((s) => s.setEditingNodeId);
  const currentDrawMode = useMapStore((s) => s.drawMode);

  const [initialCenter] = useState(() => {
    const profile = useFarmStore.getState().profile;
    if (profile.locationLat != null && profile.locationLng != null) {
      return { lat: profile.locationLat, lng: profile.locationLng };
    }
    const c = useMapStore.getState().center;
    return { lat: c[1], lng: c[0] };
  });
  const [initialZoom] = useState(() => {
    const profile = useFarmStore.getState().profile;
    if (profile.locationLat != null && profile.locationLng != null) {
      return profile.defaultZoom ?? 17;
    }
    return useMapStore.getState().zoom;
  });

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      map.setMapTypeId(useMapStore.getState().mapType);
      setMap(map);
      setMapReady(true);
    },
    [setMap]
  );

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
    setMapReady(false);
  }, [setMap]);

  const onIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter?.();
    if (c) useMapStore.getState().setCenter([c.lng(), c.lat()]);
    const z = map.getZoom?.();
    if (z != null) useMapStore.getState().setZoom(z);
  }, []);

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={initialCenter}
      zoom={initialZoom}
      mapTypeId={mapType}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={onIdle}
      onClick={() => {
        if (currentDrawMode === "none" && editingNodeId) {
          setEditingNodeId(null);
        }
      }}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        scaleControl: true,
      }}
    >
      {mapReady && <MapLayers map={mapRef.current} />}
      {mapReady && <MapDrawingHandler />}
      {mapReady && <DrawingOverlay />}
      {mapReady && <PolygonEditor />}
      {mapMarkers
        .filter((m) => m.id !== editingNodeId)
        .map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.name}
            onClick={() => {
              if (currentDrawMode !== "none") return;
              setEditingNodeId(m.id);
            }}
            options={{
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: m.color,
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

function MapLoader({ apiKey }: { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey: apiKey,
  });

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
        <div className="text-center max-w-md px-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Map failed to load</h2>
          <p className="text-text-secondary text-sm">Check your Google Maps API key and network connection.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-text-secondary">Loading Google Maps...</span>
        </div>
      </div>
    );
  }

  return (
    <MapProvider>
      <MapWithLayers />
    </MapProvider>
  );
}

export default function FarmMap() {
  const { key: apiKey, loading: keyLoading } = useGoogleMapsApiKey();

  if (keyLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
        <div className="text-center max-w-md px-6">
          <div className="mb-4 flex justify-center text-accent">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Google Maps API Key Required</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Add your key to <code className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">.env.local</code> as{" "}
            <code className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-accent">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
          </p>
        </div>
      </div>
    );
  }

  return <MapLoader apiKey={apiKey} />;
}
