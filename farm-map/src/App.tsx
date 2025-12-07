import { useEffect, useRef, useState } from 'react'
import maplibregl, { type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

const INITIAL_VIEW = {
  lng: -95.7129,
  lat: 39.8283,
  zoom: 4.25,
}

type ViewState = {
  lng: number
  lat: number
  zoom: number
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3)}°${value >= 0 ? positive : negative}`
}

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [INITIAL_VIEW.lng, INITIAL_VIEW.lat],
      zoom: INITIAL_VIEW.zoom,
      pitch: 35,
      bearing: -20,
      attributionControl: false,
    })

    mapRef.current = mapInstance

    mapInstance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left')
    mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-left',
    )
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }))

    const updateView = () => {
      const center = mapInstance.getCenter()
      setViewState({
        lng: center.lng,
        lat: center.lat,
        zoom: mapInstance.getZoom(),
      })
    }

    mapInstance.on('move', updateView)
    updateView()

    return () => {
      mapInstance.off('move', updateView)
      mapInstance.remove()
      mapRef.current = null
    }
  }, [])

  const latLabel = formatCoord(viewState.lat, 'N', 'S')
  const lngLabel = formatCoord(viewState.lng, 'E', 'W')

  return (
    <div className="app-shell">
      <div className="floating-header">
        <h1>Farm Scout</h1>
        <p>Windy-style base map to start plotting acreage, yields, and passes.</p>
      </div>
      <div className="map-panel">
        <div ref={mapContainerRef} className="map-canvas" />
        <div className="hud-card">
          <div>
            <p className="hud-label">Camera</p>
            <p className="hud-values">
              {latLabel} · {lngLabel} · z{viewState.zoom.toFixed(1)}
            </p>
          </div>
          <p className="hud-subtext">Pan, tilt, zoom, or geolocate to inspect any field.</p>
        </div>
      </div>
    </div>
  )
}

export default App
