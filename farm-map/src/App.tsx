import { useEffect, useRef, useState } from 'react'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import maplibregl, { type GeoJSONSource, type IControl, type Map } from 'maplibre-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import Draggable from 'react-draggable'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import './App.css'

const INITIAL_VIEW = {
  lng: -95.7129,
  lat: 39.8283,
  zoom: 4.25,
}

const BOUNDARY_SOURCE_ID = 'farm-boundary'
const BOUNDARY_FILL_LAYER_ID = 'farm-boundary-fill'
const BOUNDARY_LINE_LAYER_ID = 'farm-boundary-line'
const EMPTY_COLLECTION: FeatureCollection = { type: 'FeatureCollection', features: [] }

type ViewState = {
  lng: number
  lat: number
  zoom: number
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3)}°${value >= 0 ? positive : negative}`
}

function asFeatureCollection(data: FeatureCollection | Feature | FeatureCollection[] | null): FeatureCollection {
  if (!data) {
    return EMPTY_COLLECTION
  }
  if (Array.isArray(data)) {
    const merged = data.flatMap((collection) => collection.features ?? [])
    return {
      type: 'FeatureCollection',
      features: merged,
    }
  }
  if (data.type === 'FeatureCollection') {
    return data
  }
  return {
    type: 'FeatureCollection',
    features: [data],
  }
}

function extendBoundsFromGeometry(bounds: maplibregl.LngLatBounds, geometry?: Geometry | null) {
  if (!geometry) {
    return
  }
  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((child) => extendBoundsFromGeometry(bounds, child))
    return
  }
  const extendCoords = (coords: any): void => {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      bounds.extend(coords as [number, number])
      return
    }
    if (Array.isArray(coords)) {
      coords.forEach((inner) => extendCoords(inner))
    }
  }
  extendCoords(geometry.coordinates)
}

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW)
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastFileName, setLastFileName] = useState<string | null>(null)
  const [hasSketch, setHasSketch] = useState(false)
  const [activityMessage, setActivityMessage] = useState('Ready to chart your fields.')
  const [fillColor, setFillColor] = useState('#7fffd4')
  const [lineColor, setLineColor] = useState('#7fffd4')
  const [fillOpacity, setFillOpacity] = useState(0.18)
  const [lineWidth, setLineWidth] = useState(2)
  const [showSplash, setShowSplash] = useState(true)

  const logActivity = (message: string) => {
    setActivityMessage(message)
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(timer)
  }, [])

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

    mapInstance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left')
    mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-left',
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

    const ensureBoundaryLayers = () => {
      if (mapInstance.getSource(BOUNDARY_SOURCE_ID)) {
        return
      }
      mapInstance.addSource(BOUNDARY_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_COLLECTION,
      })
      mapInstance.addLayer({
        id: BOUNDARY_FILL_LAYER_ID,
        type: 'fill',
        source: BOUNDARY_SOURCE_ID,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': fillOpacity,
        },
      })
      mapInstance.addLayer({
        id: BOUNDARY_LINE_LAYER_ID,
        type: 'line',
        source: BOUNDARY_SOURCE_ID,
        paint: {
          'line-color': lineColor,
          'line-width': lineWidth,
        },
      })
    }

    const initializeDraw = () => {
      if (drawRef.current) {
        return
      }
      const drawControl = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'draw_polygon',
      })
      mapInstance.addControl(drawControl as unknown as IControl, 'top-left')
      drawRef.current = drawControl

      const refreshFromDraw = (options?: { shouldFit?: boolean }) => {
        const collection = drawControl.getAll()
        setHasSketch(Boolean(collection.features.length))
        if (!collection.features.length) {
          setBoundary(null)
          syncBoundaryOnMap(null)
          logActivity('Sketch cleared.')
          return
        }
        setBoundary(collection)
        syncBoundaryOnMap(collection)
        logActivity(`Sketch captured (${collection.features.length} feature${collection.features.length > 1 ? 's' : ''}).`)
        if (options?.shouldFit) {
          fitToCollection(collection)
        }
      }

      mapInstance.on('draw.create', () => refreshFromDraw({ shouldFit: true }))
      mapInstance.on('draw.update', () => refreshFromDraw())
      mapInstance.on('draw.delete', () => refreshFromDraw())
    }

    mapInstance.on('move', updateView)
    mapInstance.on('load', () => {
      ensureBoundaryLayers()
      initializeDraw()
    })
    updateView()

    return () => {
      mapInstance.off('move', updateView)
      mapInstance.remove()
      mapRef.current = null
      drawRef.current = null
    }
  }, [])

  const syncBoundaryOnMap = (collection: FeatureCollection | null) => {
    const source = mapRef.current?.getSource(BOUNDARY_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) {
      return
    }
    source.setData(collection ?? EMPTY_COLLECTION)
  }

  const fitToCollection = (collection: FeatureCollection) => {
    if (!collection.features.length || !mapRef.current) {
      return
    }
    const bounds = new maplibregl.LngLatBounds()
    collection.features.forEach((feature) => extendBoundsFromGeometry(bounds, feature.geometry))
    if (bounds.isEmpty()) {
      return
    }
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 800 })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setIsUploading(true)
    logActivity(`Loading ${file.name}...`)
    try {
      const parsed = await readGeospatialFile(file)
      setBoundary(parsed)
      syncBoundaryOnMap(parsed)
      fitToCollection(parsed)
      drawRef.current?.deleteAll()
      logActivity(`Imported ${parsed.features.length} feature${parsed.features.length !== 1 ? 's' : ''} from ${file.name}.`)
      setLastFileName(file.name)
      setHasSketch(false)
    } catch (error) {
      console.error(error)
      logActivity('Unable to read that file. Please upload a valid GeoJSON.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleClearBoundary = () => {
    setBoundary(null)
    drawRef.current?.deleteAll()
    syncBoundaryOnMap(null)
    setHasSketch(false)
    logActivity('Boundary reset.')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleStartDrawing = () => {
    drawRef.current?.changeMode('draw_polygon')
    logActivity('Draw mode activated.')
  }

  const handleFinishDrawing = () => {
    drawRef.current?.changeMode('simple_select')
    logActivity('Draw mode exited.')
  }

  const updateBoundaryStyle = () => {
    const map = mapRef.current
    if (!map) {
      return
    }
    if (map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
      map.setPaintProperty(BOUNDARY_FILL_LAYER_ID, 'fill-color', fillColor)
      map.setPaintProperty(BOUNDARY_FILL_LAYER_ID, 'fill-opacity', fillOpacity)
    }
    if (map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
      map.setPaintProperty(BOUNDARY_LINE_LAYER_ID, 'line-color', lineColor)
      map.setPaintProperty(BOUNDARY_LINE_LAYER_ID, 'line-width', lineWidth)
    }
  }

  useEffect(() => {
    updateBoundaryStyle()
  }, [fillColor, fillOpacity, lineColor, lineWidth])

  const latLabel = formatCoord(viewState.lat, 'N', 'S')
  const lngLabel = formatCoord(viewState.lng, 'E', 'W')

  return (
    <div className="app-shell">
      {showSplash ? (
        <div className="splash-screen">
          <div className="splash-content">
            <p>Welcome to</p>
            <h1>FarmScout</h1>
          </div>
        </div>
      ) : null}

      <div className="map-panel">
        <div ref={mapContainerRef} className="map-canvas" />

        <Draggable handle=".panel-header">
          <div className="control-panel">
            <div className="panel-header">
              <p className="control-label">Farm Boundary</p>
              <span className="panel-hint">(drag panel)</span>
            </div>
            <p className="control-subtext">
              {boundary ? `${boundary.features.length} feature(s) loaded.` : 'Sketch or upload to begin.'}
            </p>
            <div className="panel-section">
              <p className="panel-section-label">Camera</p>
              <p className="panel-coords">
                {latLabel} · {lngLabel} · z{viewState.zoom.toFixed(1)}
              </p>
            </div>

            <div className="panel-section">
              <p className="panel-section-label">Actions</p>
              <div className="control-actions">
                <button type="button" onClick={handleStartDrawing}>
                  Draw
                </button>
                <button type="button" onClick={handleFinishDrawing}>
                  Finish
                </button>
                <button type="button" onClick={handleClearBoundary} disabled={!boundary && !hasSketch}>
                  Clear
                </button>
              </div>
              <div className="control-actions">
                <button type="button" onClick={handleUploadClick} disabled={isUploading}>
                  {isUploading ? 'Uploading…' : 'Upload GeoJSON'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json"
                className="sr-only"
                onChange={handleFileChange}
              />
              {lastFileName ? <p className="status-subline">Last import: {lastFileName}</p> : null}
            </div>

            <div className="panel-section">
              <p className="panel-section-label">Style</p>
              <div className="style-row">
                <label>
                  Fill
                  <input type="color" value={fillColor} onChange={(event) => setFillColor(event.target.value)} />
                </label>
                <label>
                  Line
                  <input type="color" value={lineColor} onChange={(event) => setLineColor(event.target.value)} />
                </label>
              </div>
              <div className="style-row sliders">
                <label>
                  Fill opacity
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={fillOpacity}
                    onChange={(event) => setFillOpacity(Number(event.target.value))}
                  />
                </label>
                <label>
                  Line width
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={lineWidth}
                    onChange={(event) => setLineWidth(Number(event.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>
        </Draggable>
      </div>

      <div className="activity-ticker">
        <span>&gt; {activityMessage}</span>
      </div>
    </div>
  )
}

async function readGeospatialFile(file: File): Promise<FeatureCollection> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'geojson' || extension === 'json') {
    const text = await file.text()
    return asFeatureCollection(JSON.parse(text))
  }
  throw new Error('Unsupported file type')
}

export default App
