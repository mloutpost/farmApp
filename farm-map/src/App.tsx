import { useCallback, useEffect, useRef, useState } from 'react'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import maplibregl, { type IControl, type Map } from 'maplibre-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import Draggable from 'react-draggable'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import './App.css'

const BASEMAP_STYLES = {
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite: {
    version: 8 as 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
      },
    ],
  },
}

const INITIAL_VIEW = {
  lng: -95.7129,
  lat: 39.8283,
  zoom: 4.25,
}

const COLOR_PALETTE = ['#7fffd4', '#ffb347', '#7dd3fc', '#f472b6', '#c084fc', '#facc15']

type ViewState = {
  lng: number
  lat: number
  zoom: number
}

type PanelPage = 'farm' | 'layers' | 'settings'

type LayerRecord = {
  id: string
  name: string
  data: FeatureCollection
  fillColor: string
  lineColor: string
  fillOpacity: number
  lineWidth: number
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3)}°${value >= 0 ? positive : negative}`
}

function asFeatureCollection(data: FeatureCollection | Feature | FeatureCollection[] | null): FeatureCollection {
  if (!data) {
    return { type: 'FeatureCollection', features: [] }
  }
  if (Array.isArray(data)) {
    const features = data.flatMap((collection) => collection.features ?? [])
    return { type: 'FeatureCollection', features }
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scaleControlRef = useRef<maplibregl.ScaleControl | null>(null)
  const mountedLayerIdsRef = useRef<Set<string>>(new Set())

  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW)
  const [draftSketch, setDraftSketch] = useState<FeatureCollection | null>(null)
  const [hasSketch, setHasSketch] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [lastFileName, setLastFileName] = useState<string | null>(null)
  const [activityMessage, setActivityMessage] = useState('Ready to chart your fields.')
  const [showSplash, setShowSplash] = useState(true)
  const [panelPage, setPanelPage] = useState<PanelPage>('farm')
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>('mi')
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>('dark')
  const [baseStyle, setBaseStyle] = useState<'voyager' | 'satellite'>('voyager')
  const [layers, setLayers] = useState<LayerRecord[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [styleVersion, setStyleVersion] = useState(0)

  const logActivity = (message: string) => {
    setActivityMessage(message)
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (themePreference === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => {
        root.setAttribute('data-theme', media.matches ? 'dark' : 'light')
      }
      apply()
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    root.setAttribute('data-theme', themePreference)
    return () => {
      root.removeAttribute('data-theme')
    }
  }, [themePreference])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASEMAP_STYLES[baseStyle],
      center: [INITIAL_VIEW.lng, INITIAL_VIEW.lat],
      zoom: INITIAL_VIEW.zoom,
      pitch: 35,
      bearing: -20,
      attributionControl: false,
    })

    mapRef.current = mapInstance

    const scaleControl = new maplibregl.ScaleControl({ unit: distanceUnit === 'mi' ? 'imperial' : 'metric' })
    mapInstance.addControl(scaleControl, 'bottom-left')
    scaleControlRef.current = scaleControl

    mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-left',
    )
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }))

    const drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'draw_polygon',
    })
    mapInstance.addControl(drawControl as unknown as IControl, 'top-left')
    drawRef.current = drawControl

    const updateView = () => {
      const center = mapInstance.getCenter()
      setViewState({
        lng: center.lng,
        lat: center.lat,
        zoom: mapInstance.getZoom(),
      })
    }

    const refreshFromDraw = () => {
      const collection = drawControl.getAll()
      setDraftSketch(collection.features.length ? collection : null)
      setHasSketch(Boolean(collection.features.length))
      if (collection.features.length) {
        logActivity(`Sketch captured (${collection.features.length} feature${collection.features.length > 1 ? 's' : ''}).`)
      }
    }

    mapInstance.on('move', updateView)
    mapInstance.on('draw.create', refreshFromDraw)
    mapInstance.on('draw.update', refreshFromDraw)
    mapInstance.on('draw.delete', refreshFromDraw)
    mapInstance.on('load', updateView)

    return () => {
      mapInstance.off('move', updateView)
      mapInstance.remove()
      mapRef.current = null
      drawRef.current = null
      scaleControlRef.current = null
    }
  }, [baseStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    map.setStyle(BASEMAP_STYLES[baseStyle])
    map.once('styledata', () => setStyleVersion((version) => version + 1))
    logActivity(`Basemap switched to ${baseStyle === 'voyager' ? 'cartographic' : 'satellite'} mode.`)
  }, [baseStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const unit = distanceUnit === 'mi' ? 'imperial' : 'metric'
    if (scaleControlRef.current) {
      scaleControlRef.current.setUnit(unit)
    }
    logActivity(`Units set to ${distanceUnit === 'mi' ? 'miles' : 'kilometers'}.`)
  }, [distanceUnit])

  const renderLayersOnMap = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }

    mountedLayerIdsRef.current.forEach((layerId) => {
      const sourceId = `${layerId}-source`
      const fillId = `${layerId}-fill`
      const lineId = `${layerId}-line`
      if (map.getLayer(fillId)) map.removeLayer(fillId)
      if (map.getLayer(lineId)) map.removeLayer(lineId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    })
    mountedLayerIdsRef.current.clear()

    layers.forEach((layer) => {
      const sourceId = `${layer.id}-source`
      map.addSource(sourceId, { type: 'geojson', data: layer.data })
      map.addLayer({
        id: `${layer.id}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': layer.fillColor,
          'fill-opacity': layer.fillOpacity,
        },
      })
      map.addLayer({
        id: `${layer.id}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': layer.lineColor,
          'line-width': layer.lineWidth,
        },
      })
      mountedLayerIdsRef.current.add(layer.id)
    })
  }, [layers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    if (map.isStyleLoaded()) {
      renderLayersOnMap()
    } else {
      map.once('load', renderLayersOnMap)
    }
  }, [layers, renderLayersOnMap, styleVersion])

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

  const addLayerFromData = (data: FeatureCollection, name?: string) => {
    if (!data.features.length) {
      logActivity('Uploaded GeoJSON had no features.')
      return
    }
    const index = layers.length
    const newLayer: LayerRecord = {
      id: `layer-${Date.now()}-${index}`,
      name: name?.replace(/\.[^/.]+$/, '') || `Layer ${index + 1}`,
      data,
      fillColor: COLOR_PALETTE[index % COLOR_PALETTE.length],
      lineColor: '#ffffff',
      fillOpacity: 0.2,
      lineWidth: 2,
    }
    setLayers((prev) => [...prev, newLayer])
    setActiveLayerId(newLayer.id)
    logActivity(`Layer "${newLayer.name}" added.`)
    fitToCollection(data)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setIsUploading(true)
    logActivity(`Loading ${file.name}...`)
    try {
      const text = await file.text()
      const parsed = asFeatureCollection(JSON.parse(text))
      addLayerFromData(parsed, file.name)
      setLastFileName(file.name)
    } catch (error) {
      console.error(error)
      logActivity('Unable to read that file. Please upload a valid GeoJSON.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleClearSketch = () => {
    drawRef.current?.deleteAll()
    setDraftSketch(null)
    setHasSketch(false)
    logActivity('Sketch cleared.')
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

  const handleSaveSketchAsLayer = () => {
    const sketch = drawRef.current?.getAll()
    if (!sketch || !sketch.features.length) {
      return
    }
    addLayerFromData(sketch, `Sketch ${layers.length + 1}`)
    drawRef.current?.deleteAll()
    setDraftSketch(null)
    setHasSketch(false)
  }

  const handleLayerStyleChange = (layerId: string, partial: Partial<LayerRecord>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === layerId ? { ...layer, ...partial } : layer)))
  }

  const handleLayerDelete = (layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId))
    if (activeLayerId === layerId) {
      setActiveLayerId(null)
    }
    logActivity('Layer removed.')
  }

  const latLabel = formatCoord(viewState.lat, 'N', 'S')
  const lngLabel = formatCoord(viewState.lng, 'E', 'W')
  const activeLayer = activeLayerId ? layers.find((layer) => layer.id === activeLayerId) ?? null : layers[0] ?? null

  const renderFarmPage = () => (
    <>
      <p className="panel-subtext">
        {layers.length ? `${layers.length} layer${layers.length === 1 ? '' : 's'} tracked.` : 'Add a GeoJSON or sketch to begin.'}
      </p>
      <div className="panel-section">
        <p className="panel-section-label">Intake</p>
        <div className="control-actions">
          <button type="button" onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? 'Uploading…' : 'Upload GeoJSON'}
          </button>
          <button type="button" onClick={handleSaveSketchAsLayer} disabled={!hasSketch}>
            Save sketch
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".geojson,.json" className="sr-only" onChange={handleFileChange} />
        {lastFileName ? <p className="status-subline">Last import: {lastFileName}</p> : null}
      </div>
      <div className="panel-section">
        <p className="panel-section-label">Sketch tools</p>
        <div className="control-actions">
          <button type="button" onClick={handleStartDrawing}>
            Draw
          </button>
          <button type="button" onClick={handleFinishDrawing}>
            Finish
          </button>
          <button type="button" onClick={handleClearSketch} disabled={!hasSketch}>
            Clear
          </button>
        </div>
        {draftSketch ? (
          <p className="status-subline">Draft contains {draftSketch.features.length} feature{draftSketch.features.length === 1 ? '' : 's'}.</p>
        ) : null}
      </div>
    </>
  )

  const renderLayersPage = () => (
    <div className="layers-page">
      <div className="layer-list">
        {layers.length === 0 ? (
          <p className="empty-state">No layers yet. Upload GeoJSON to add one.</p>
        ) : (
          layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={layer.id === activeLayerId ? 'layer-row active' : 'layer-row'}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <span>{layer.name}</span>
              <small>{layer.data.features.length} feature{layer.data.features.length === 1 ? '' : 's'}</small>
            </button>
          ))
        )}
      </div>
      {activeLayer ? (
        <div className="layer-editor">
          <p className="panel-section-label">Style overrides</p>
          <div className="style-row">
            <label>
              Fill
              <input
                type="color"
                value={activeLayer.fillColor}
                onChange={(event) => handleLayerStyleChange(activeLayer.id, { fillColor: event.target.value })}
              />
            </label>
            <label>
              Line
              <input
                type="color"
                value={activeLayer.lineColor}
                onChange={(event) => handleLayerStyleChange(activeLayer.id, { lineColor: event.target.value })}
              />
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
                value={activeLayer.fillOpacity}
                onChange={(event) => handleLayerStyleChange(activeLayer.id, { fillOpacity: Number(event.target.value) })}
              />
            </label>
            <label>
              Line width
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={activeLayer.lineWidth}
                onChange={(event) => handleLayerStyleChange(activeLayer.id, { lineWidth: Number(event.target.value) })}
              />
            </label>
          </div>
          <button type="button" className="danger-button" onClick={() => handleLayerDelete(activeLayer.id)}>
            Delete layer
          </button>
        </div>
      ) : null}
    </div>
  )

  const renderSettingsPage = () => (
    <div className="panel-section stack">
      <div>
        <p className="panel-section-label">Units</p>
        <div className="segmented">
          <button type="button" className={distanceUnit === 'mi' ? 'active' : ''} onClick={() => setDistanceUnit('mi')}>
            Miles
          </button>
          <button type="button" className={distanceUnit === 'km' ? 'active' : ''} onClick={() => setDistanceUnit('km')}>
            Km
          </button>
        </div>
      </div>
      <div>
        <p className="panel-section-label">Theme</p>
        <div className="segmented triple">
          <button type="button" className={themePreference === 'dark' ? 'active' : ''} onClick={() => setThemePreference('dark')}>
            Dark
          </button>
          <button type="button" className={themePreference === 'light' ? 'active' : ''} onClick={() => setThemePreference('light')}>
            Light
          </button>
          <button type="button" className={themePreference === 'system' ? 'active' : ''} onClick={() => setThemePreference('system')}>
            System
          </button>
        </div>
      </div>
      <div>
        <p className="panel-section-label">Basemap</p>
        <div className="segmented">
          <button type="button" className={baseStyle === 'voyager' ? 'active' : ''} onClick={() => setBaseStyle('voyager')}>
            Light topo
          </button>
          <button type="button" className={baseStyle === 'satellite' ? 'active' : ''} onClick={() => setBaseStyle('satellite')}>
            Satellite
          </button>
        </div>
      </div>
    </div>
  )

  const renderPanelContent = () => {
    if (panelPage === 'layers') {
      return renderLayersPage()
    }
    if (panelPage === 'settings') {
      return renderSettingsPage()
    }
    return renderFarmPage()
  }

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

        <Draggable handle=".panel-drag-handle" nodeRef={panelRef}>
          <div ref={panelRef} className="control-panel">
            <div className="panel-header">
              <button type="button" className="panel-drag-handle" aria-label="Drag panel">
                <span aria-hidden="true">⤢</span>
              </button>
              <div className="panel-tabs">
                {[
                  { id: 'farm', label: 'My Farm' },
                  { id: 'layers', label: 'Layers' },
                  { id: 'settings', label: 'Settings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={panelPage === (tab.id as PanelPage) ? 'active' : ''}
                    onClick={() => setPanelPage(tab.id as PanelPage)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-body">{renderPanelContent()}</div>
          </div>
        </Draggable>

        <div className="coords-badge">
          <span>{latLabel}</span>
          <span>{lngLabel}</span>
        </div>
        <div className="pan-indicator" aria-hidden="true">
          <span>✥</span>
        </div>
      </div>

      <div className="activity-ticker">
        <span>&gt; {activityMessage}</span>
      </div>
    </div>
  )
}

export default App
