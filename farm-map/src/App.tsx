import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import maplibregl, {
  type FillLayerSpecification,
  type IControl,
  type Map,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import Draggable from 'react-draggable'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import './App.css'

const BASEMAP_STYLES: Record<'voyager' | 'satellite', string | StyleSpecification> = {
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  satellite: {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
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
const LAYER_TOOLTIP_DELAY = 500
const FEATURE_TOOLTIP_DELAY = 500
const CAMERA_MARKER_CLASS = 'camera-marker'
const SOIL_SOURCE_ID = 'soil-overlay-source'
const SOIL_LAYER_ID = 'soil-overlay-layer'
const DEFAULT_HOVER_FIELDS = ['name', 'crop', 'acres']

 type ViewState = {
  lng: number
  lat: number
  zoom: number
}

type PanelPage = 'farm' | 'layers' | 'settings' | 'camera'
type HatchPattern = 'solid' | 'diagonal' | 'cross'
type CameraMode = 'north-up' | 'free'

type LayerSourceType = 'sketch' | 'upload'

type LayerRecord = {
  id: string
  name: string
  data: FeatureCollection
  sourceType: LayerSourceType
  fillColor: string
  lineColor: string
  fillOpacity: number
  lineWidth: number
  hatchPattern: HatchPattern
}

type LayerTooltip = {
  id: string
  x: number
  y: number
  details: string
}

type MapHoverInfo = {
  feature: Feature
  x: number
  y: number
}

type CameraRecord = {
  id: string
  name: string
  streamUrl: string
  lat: number
  lng: number
}

type CameraPreview = {
  camera: CameraRecord
  x?: number
  y?: number
}

const formatCoord = (value: number, positive: string, negative: string) => `${Math.abs(value).toFixed(3)}°${value >= 0 ? positive : negative}`

function asFeatureCollection(data: FeatureCollection | Feature | FeatureCollection[] | Feature[] | null): FeatureCollection {
  if (!data) {
    return { type: 'FeatureCollection', features: [] }
  }
  if (Array.isArray(data)) {
    const features = data.flatMap((item) => (item.type === 'FeatureCollection' ? item.features ?? [] : item))
    return { type: 'FeatureCollection', features: features as Feature[] }
  }
  if (data.type === 'FeatureCollection') {
    return data
  }
  return { type: 'FeatureCollection', features: [data] }
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

function createPatternImage(pattern: Exclude<HatchPattern, 'solid'>) {
  const size = 8
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to create pattern context')
  }
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1
  ctx.clearRect(0, 0, size, size)
  if (pattern === 'diagonal') {
    ctx.beginPath()
    ctx.moveTo(0, size)
    ctx.lineTo(size, 0)
    ctx.stroke()
  } else if (pattern === 'cross') {
    ctx.beginPath()
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.moveTo(size / 2, 0)
    ctx.lineTo(size / 2, size)
    ctx.stroke()
  }
  return ctx.getImageData(0, 0, size, size)
}

const formatTimestamp = () => {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const scaleControlRef = useRef<maplibregl.ScaleControl | null>(null)
  const mountedLayerIdsRef = useRef<Set<string>>(new Set())
  const layerTooltipTimerRef = useRef<number | null>(null)
  const mapHoverTimerRef = useRef<number | null>(null)
  const cameraMarkersRef = useRef<maplibregl.Marker[]>([])
  const pickCameraLocationRef = useRef(false)

  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW)
  const [hasSketch, setHasSketch] = useState(false)
  const [draftSketch, setDraftSketch] = useState<FeatureCollection | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastFileName, setLastFileName] = useState<string | null>(null)
  const [activityMessage, setActivityMessage] = useState(`[${formatTimestamp()}] Ready to chart your fields.`)
  const [showSplash, setShowSplash] = useState(true)
  const [panelPage, setPanelPage] = useState<PanelPage>('farm')
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>('mi')
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>('dark')
  const [baseStyle, setBaseStyle] = useState<'voyager' | 'satellite'>('voyager')
  const [cameraMode, setCameraMode] = useState<CameraMode>('north-up')
  const [layers, setLayers] = useState<LayerRecord[]>([])
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null)
  const [layerTooltip, setLayerTooltip] = useState<LayerTooltip | null>(null)
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [mapHoverInfo, setMapHoverInfo] = useState<MapHoverInfo | null>(null)
  const [cameras, setCameras] = useState<CameraRecord[]>([])
  const [cameraForm, setCameraForm] = useState({ name: '', streamUrl: '', lat: '', lng: '' })
  const [cameraPreview, setCameraPreview] = useState<CameraPreview | null>(null)
  const [pickCameraLocation, setPickCameraLocation] = useState(false)
  const [cameraRenameId, setCameraRenameId] = useState<string | null>(null)
  const [cameraRenameDraft, setCameraRenameDraft] = useState('')
  const [showSoilLayer, setShowSoilLayer] = useState(false)
  const [styleVersion, setStyleVersion] = useState(0)
  const cameraPreviewRef = useRef<HTMLDivElement | null>(null)

  const logActivity = (message: string) => {
    setActivityMessage(`[${formatTimestamp()}] ${message}`)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    pickCameraLocationRef.current = pickCameraLocation
  }, [pickCameraLocation])

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
      pitch: 0,
      bearing: 0,
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
      setViewState({ lng: center.lng, lat: center.lat, zoom: mapInstance.getZoom() })
    }

    const refreshFromDraw = () => {
      const collection = drawControl.getAll()
      setDraftSketch(collection.features.length ? collection : null)
      setHasSketch(Boolean(collection.features.length))
      if (collection.features.length) {
        logActivity(`Sketch captured (${collection.features.length} feature${collection.features.length > 1 ? 's' : ''}).`)
      }
    }

    const handleMapClick = (event: MapMouseEvent) => {
      if (!pickCameraLocationRef.current) {
        return
      }
      setCameraForm((prev) => ({
        ...prev,
        lat: event.lngLat.lat.toFixed(6),
        lng: event.lngLat.lng.toFixed(6),
      }))
      setPickCameraLocation(false)
      pickCameraLocationRef.current = false
      logActivity('Camera location captured from map.')
    }

    mapInstance.on('move', updateView)
    mapInstance.on('draw.create', refreshFromDraw)
    mapInstance.on('draw.update', refreshFromDraw)
    mapInstance.on('draw.delete', refreshFromDraw)
    mapInstance.on('load', updateView)
    mapInstance.on('click', handleMapClick)

    return () => {
      mapInstance.off('click', handleMapClick)
      mapInstance.remove()
      mapRef.current = null
      drawRef.current = null
      scaleControlRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    map.setStyle(BASEMAP_STYLES[baseStyle])
    map.once('styledata', () => {
      setStyleVersion((version) => version + 1)
      logActivity(`Basemap switched to ${baseStyle === 'voyager' ? 'cartographic' : 'satellite'} mode.`)
    })
  }, [baseStyle])

  useEffect(() => {
    if (!scaleControlRef.current) {
      return
    }
    const unit = distanceUnit === 'mi' ? 'imperial' : 'metric'
    scaleControlRef.current.setUnit(unit)
    logActivity(`Units set to ${distanceUnit === 'mi' ? 'miles' : 'kilometers'}.`)
  }, [distanceUnit])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    if (cameraMode === 'north-up') {
      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()
      map.easeTo({ bearing: 0, pitch: 0, duration: 600 })
    } else {
      map.dragRotate.enable()
      map.touchZoomRotate.enableRotation()
    }
  }, [cameraMode])

  const ensurePatternImage = useCallback((map: Map, pattern: HatchPattern) => {
    if (pattern === 'solid') {
      return
    }
    const imageId = `hatch-${pattern}`
    if (map.hasImage(imageId)) {
      return
    }
    const imageData = createPatternImage(pattern)
    map.addImage(imageId, imageData, { pixelRatio: 2 })
  }, [])

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

      const fillPaint: FillLayerSpecification['paint'] = {
        'fill-color': layer.fillColor,
        'fill-opacity': layer.fillOpacity,
      }
      if (layer.hatchPattern !== 'solid') {
        ensurePatternImage(map, layer.hatchPattern)
        fillPaint['fill-pattern'] = `hatch-${layer.hatchPattern}`
      }

      map.addLayer({ id: `${layer.id}-fill`, type: 'fill', source: sourceId, paint: fillPaint })
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
  }, [ensurePatternImage, layers])

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
  }, [renderLayersOnMap, styleVersion])

  const syncSoilOverlay = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }
    const anchorLayerId = layers.length ? `${layers[0].id}-fill` : undefined
    if (showSoilLayer) {
      if (!map.getSource(SOIL_SOURCE_ID)) {
        map.addSource(SOIL_SOURCE_ID, {
          type: 'raster',
          tiles: ['https://gis.nrcs.usda.gov/server/services/Soils/SSURGO_Landscape/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'USDA NRCS',
        })
      }
      if (!map.getLayer(SOIL_LAYER_ID)) {
        map.addLayer(
          {
            id: SOIL_LAYER_ID,
            type: 'raster',
            source: SOIL_SOURCE_ID,
            paint: { 'raster-opacity': 0.65 },
          },
          anchorLayerId,
        )
      }
    } else {
      if (map.getLayer(SOIL_LAYER_ID)) {
        map.removeLayer(SOIL_LAYER_ID)
      }
      if (map.getSource(SOIL_SOURCE_ID)) {
        map.removeSource(SOIL_SOURCE_ID)
      }
    }
  }, [layers, showSoilLayer])

  useEffect(() => {
    syncSoilOverlay()
  }, [syncSoilOverlay, styleVersion])

  useEffect(() => {
    logActivity(showSoilLayer ? 'Soil survey overlay enabled.' : 'Soil survey overlay hidden.')
  }, [showSoilLayer])

  const renderCamerasOnMap = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }
    cameraMarkersRef.current.forEach((marker) => marker.remove())
    cameraMarkersRef.current = cameras.map((camera) => {
      const el = document.createElement('div')
      el.className = CAMERA_MARKER_CLASS
      el.innerHTML = '📷'
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        setCameraPreview({ camera, x: event.clientX, y: event.clientY })
      })
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([camera.lng, camera.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<strong>${camera.name}</strong><br/><a href="${camera.streamUrl}" target="_blank" rel="noreferrer">Open stream</a>`
          ),
        )
        .addTo(map)
      return marker
    })
  }, [cameras])

  useEffect(() => {
    renderCamerasOnMap()
  }, [renderCamerasOnMap, styleVersion])

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

  const addLayerFromData = (data: FeatureCollection, name?: string, sourceType: LayerSourceType = 'upload') => {
    if (!data.features.length) {
      logActivity('Uploaded GeoJSON had no features.')
      return
    }
    const index = layers.length
    const newLayer: LayerRecord = {
      id: `layer-${Date.now()}-${index}`,
      name: name?.replace(/\.[^/.]+$/, '') || `Layer ${index + 1}`,
      data,
      sourceType,
      fillColor: COLOR_PALETTE[index % COLOR_PALETTE.length],
      lineColor: '#ffffff',
      fillOpacity: 0.25,
      lineWidth: 2,
      hatchPattern: 'solid',
    }
    setLayers((prev) => [...prev, newLayer])
    setExpandedLayerId(newLayer.id)
    logActivity(`Layer "${newLayer.name}" added.`)
    fitToCollection(data)
  }

  const parseGeojsonFile = async (file: File): Promise<FeatureCollection> => {
    const text = await file.text()
    try {
      return asFeatureCollection(JSON.parse(text))
    } catch (error) {
      const ndjsonFeatures: Feature[] = []
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        ndjsonFeatures.push(JSON.parse(trimmed))
      }
      if (!ndjsonFeatures.length) {
        throw error
      }
      return asFeatureCollection(ndjsonFeatures)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setIsUploading(true)
    logActivity(`Loading ${file.name}...`)
    try {
      const parsed = await parseGeojsonFile(file)
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
    addLayerFromData(sketch, `Sketch ${layers.length + 1}`, 'sketch')
    drawRef.current?.deleteAll()
    setDraftSketch(null)
    setHasSketch(false)
  }

  const handleLayerStyleChange = (layerId: string, partial: Partial<LayerRecord>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === layerId ? { ...layer, ...partial } : layer)))
  }

  const handleLayerDelete = (layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId))
    if (expandedLayerId === layerId) {
      setExpandedLayerId(null)
    }
    logActivity('Layer removed.')
  }

  const beginRename = (layer: LayerRecord) => {
    setRenamingLayerId(layer.id)
    setRenameDraft(layer.name)
  }

  const commitRename = () => {
    if (!renamingLayerId) {
      return
    }
    setLayers((prev) => prev.map((layer) => (layer.id === renamingLayerId ? { ...layer, name: renameDraft || layer.name } : layer)))
    setRenamingLayerId(null)
  }

  const handleLayerClick = (layer: LayerRecord) => {
    const nextExpanded = expandedLayerId === layer.id ? null : layer.id
    setExpandedLayerId(nextExpanded)
    fitToCollection(layer.data)
  }

  const latLabel = formatCoord(viewState.lat, 'N', 'S')
  const lngLabel = formatCoord(viewState.lng, 'E', 'W')

  const handleLayerMouseEnter = (layer: LayerRecord, event: React.MouseEvent<HTMLButtonElement>) => {
    if (layerTooltipTimerRef.current) {
      window.clearTimeout(layerTooltipTimerRef.current)
    }
    const rect = panelRef.current?.getBoundingClientRect()
    const tooltipX = event.clientX - (rect?.left ?? 0)
    const tooltipY = event.clientY - (rect?.top ?? 0)
    layerTooltipTimerRef.current = window.setTimeout(() => {
      const sampleProps = layer.data.features[0]?.properties ?? {}
      const propLines = Object.entries(sampleProps)
        .filter(([_, value]) => value !== undefined && value !== null)
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${value}`)
      const lines = [
        `${layer.name}`,
        `${layer.data.features.length} feature${layer.data.features.length === 1 ? '' : 's'}`,
        ...propLines,
      ]
      setLayerTooltip({
        id: layer.id,
        x: tooltipX,
        y: tooltipY,
        details: lines.join('\n'),
      })
    }, LAYER_TOOLTIP_DELAY)
  }

  const handleLayerMouseLeave = () => {
    if (layerTooltipTimerRef.current) {
      window.clearTimeout(layerTooltipTimerRef.current)
      layerTooltipTimerRef.current = null
    }
    setLayerTooltip(null)
  }

const hoverLayerIds = useMemo(() => layers.flatMap((layer) => [`${layer.id}-fill`, `${layer.id}-line`]), [layers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const handleMouseMove = (event: MapMouseEvent) => {
      if (!hoverLayerIds.length) {
        map.getCanvas().style.cursor = ''
        return
      }
      if (mapHoverTimerRef.current) {
        window.clearTimeout(mapHoverTimerRef.current)
      }
      const features = map.queryRenderedFeatures(event.point, { layers: hoverLayerIds })
      if (!features.length) {
        map.getCanvas().style.cursor = ''
        setMapHoverInfo(null)
        return
      }
      map.getCanvas().style.cursor = 'help'
      const containerRect = mapContainerRef.current?.getBoundingClientRect()
      const x = event.point.x + (containerRect?.left ?? 0)
      const y = event.point.y + (containerRect?.top ?? 0)
      mapHoverTimerRef.current = window.setTimeout(() => {
        setMapHoverInfo({ feature: features[0], x, y })
      }, FEATURE_TOOLTIP_DELAY)
    }

    const clearHover = () => {
      if (mapHoverTimerRef.current) {
        window.clearTimeout(mapHoverTimerRef.current)
        mapHoverTimerRef.current = null
      }
      map.getCanvas().style.cursor = ''
      setMapHoverInfo(null)
    }

    map.on('mousemove', handleMouseMove)
    map.on('mouseout', clearHover)

    return () => {
      map.off('mousemove', handleMouseMove)
      map.off('mouseout', clearHover)
    }
  }, [hoverLayerIds])

  const togglePickCameraLocation = () => {
    setPickCameraLocation((prev) => {
      const next = !prev
      if (next) {
        drawRef.current?.changeMode('simple_select')
        logActivity('Click anywhere on the map to assign camera coordinates.')
      }
      return next
    })
  }

  const handleAddCamera = () => {
    if (!cameraForm.name || !cameraForm.streamUrl || !cameraForm.lat || !cameraForm.lng) {
      return
    }
    const lat = Number(cameraForm.lat)
    const lng = Number(cameraForm.lng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return
    }
    const newCamera: CameraRecord = {
      id: `cam-${Date.now()}`,
      name: cameraForm.name,
      streamUrl: cameraForm.streamUrl,
      lat,
      lng,
    }
    setCameras((prev) => [...prev, newCamera])
    setCameraForm({ name: '', streamUrl: '', lat: '', lng: '' })
    logActivity(`Camera "${newCamera.name}" registered.`)
  }

  const handleRemoveCamera = (cameraId: string) => {
    setCameras((prev) => prev.filter((camera) => camera.id !== cameraId))
    if (cameraRenameId === cameraId) {
      setCameraRenameId(null)
    }
    if (cameraPreview?.camera.id === cameraId) {
      setCameraPreview(null)
    }
    logActivity('Camera removed.')
  }

  const handleFocusCamera = (camera: CameraRecord) => {
    if (!mapRef.current) {
      return
    }
    mapRef.current.easeTo({ center: [camera.lng, camera.lat], zoom: 16, duration: 800 })
  }

  const handlePreviewCamera = (camera: CameraRecord) => {
    setCameraPreview({ camera, x: 220, y: 200 })
  }

  const beginCameraRename = (camera: CameraRecord) => {
    setCameraRenameId(camera.id)
    setCameraRenameDraft(camera.name)
  }

  const commitCameraRename = () => {
    if (!cameraRenameId) {
      return
    }
    setCameras((prev) =>
      prev.map((camera) => (camera.id === cameraRenameId ? { ...camera, name: cameraRenameDraft || camera.name } : camera)),
    )
    setCameraRenameId(null)
  }

  const renderFarmPage = () => (
    <>
      <p className="panel-subtext">A high-level summary pane reserved for future agronomic widgets.</p>
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
        <div className="control-actions">
          <button type="button" className="primary-button" onClick={handleSaveSketchAsLayer} disabled={!hasSketch}>
            Save sketch to layers
          </button>
        </div>
        {draftSketch ? (
          <p className="status-subline">Draft contains {draftSketch.features.length} feature{draftSketch.features.length === 1 ? '' : 's'}.</p>
        ) : null}
      </div>
    </>
  )

  const renderLayerGroup = (title: string, entries: LayerRecord[]) => (
    <div className="layer-group" key={title}>
      <div className="layer-group-header">
        <p>{title}</p>
        <small>{entries.length} item{entries.length === 1 ? '' : 's'}</small>
      </div>
      <div className="layer-list">
        {entries.map((layer) => {
          const expanded = expandedLayerId === layer.id
          return (
            <div key={layer.id} className={`layer-block ${expanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className={expanded ? 'layer-row active info-hover' : 'layer-row info-hover'}
                onClick={() => handleLayerClick(layer)}
                onDoubleClick={() => beginRename(layer)}
                onMouseEnter={(event) => handleLayerMouseEnter(layer, event)}
                onMouseLeave={handleLayerMouseLeave}
              >
                {renamingLayerId === layer.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        commitRename()
                      } else if (event.key === 'Escape') {
                        setRenamingLayerId(null)
                      }
                    }}
                  />
                ) : (
                  <span>{layer.name}</span>
                )}
                <small>{layer.data.features.length} feature{layer.data.features.length === 1 ? '' : 's'}</small>
              </button>
              {expanded ? (
                <div className="layer-editor">
                  <div className="style-row">
                    <label>
                      Fill
                      <input
                        type="color"
                        value={layer.fillColor}
                        onChange={(event) => handleLayerStyleChange(layer.id, { fillColor: event.target.value })}
                      />
                    </label>
                    <label>
                      Line
                      <input
                        type="color"
                        value={layer.lineColor}
                        onChange={(event) => handleLayerStyleChange(layer.id, { lineColor: event.target.value })}
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
                        value={layer.fillOpacity}
                        onChange={(event) => handleLayerStyleChange(layer.id, { fillOpacity: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      Line width
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.5"
                        value={layer.lineWidth}
                        onChange={(event) => handleLayerStyleChange(layer.id, { lineWidth: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                  <label className="selector">
                    Hatching
                    <select
                      value={layer.hatchPattern}
                      onChange={(event) => handleLayerStyleChange(layer.id, { hatchPattern: event.target.value as HatchPattern })}
                    >
                      <option value="solid">Solid</option>
                      <option value="diagonal">Diagonal</option>
                      <option value="cross">Cross</option>
                    </select>
                  </label>
                  <button type="button" className="danger-button" onClick={() => handleLayerDelete(layer.id)}>
                    Delete layer
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderLayersPage = () => {
    const grouped = new globalThis.Map<string, LayerRecord[]>()
    layers.forEach((layer) => {
      const group = layer.sourceType === 'sketch' ? 'Sketches' : 'Imported layers'
      if (!grouped.has(group)) {
        grouped.set(group, [])
      }
      grouped.get(group)!.push(layer)
    })

    return (
      <div className="layers-page">
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
          <div className="control-actions">
            <button type="button" className="primary-button" onClick={handleSaveSketchAsLayer} disabled={!hasSketch}>
              Save sketch to layers
            </button>
            <button type="button" className="primary-button" onClick={handleUploadClick} disabled={isUploading}>
              {isUploading ? 'Uploading…' : 'Upload GeoJSON'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".geojson,.json" className="sr-only" onChange={handleFileChange} />
          {lastFileName ? <p className="status-subline">Last import: {lastFileName}</p> : null}
        </div>

        {layers.length === 0 ? (
          <p className="empty-state">No layers yet. Upload GeoJSON to add one.</p>
        ) : (
          Array.from(grouped.entries()).map(([title, entries]) => renderLayerGroup(title, entries))
        )}

        {layerTooltip && layerTooltip.id ? (
          <div className="layer-tooltip" style={{ left: layerTooltip.x, top: layerTooltip.y }}>
            {layerTooltip.details}
          </div>
        ) : null}
      </div>
    )
  }

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
      <div>
        <p className="panel-section-label">Soil survey overlay</p>
        <div className="segmented">
          <button type="button" className={!showSoilLayer ? 'active' : ''} onClick={() => setShowSoilLayer(false)}>
            Hidden
          </button>
          <button type="button" className={showSoilLayer ? 'active' : ''} onClick={() => setShowSoilLayer(true)}>
            Visible
          </button>
        </div>
        <small className="status-subline">
          Data from USDA NRCS Web Soil Survey (SSURGO Landcape). Renders beneath your layers.
        </small>
      </div>
    </div>
  )

  const renderCameraPage = () => (
    <div className="panel-section stack">
      <div>
        <p className="panel-section-label">Camera orientation</p>
        <div className="segmented">
          <button type="button" className={cameraMode === 'north-up' ? 'active' : ''} onClick={() => setCameraMode('north-up')}>
            North-up
          </button>
          <button type="button" className={cameraMode === 'free' ? 'active' : ''} onClick={() => setCameraMode('free')}>
            Free roam
          </button>
        </div>
      </div>
      <div>
        <p className="panel-section-label">Add Reolink stream</p>
        <input
          className="text-input"
          placeholder="Camera name"
          value={cameraForm.name}
          onChange={(event) => setCameraForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          className="text-input"
          placeholder="Stream URL (RTSP/HTTPS)"
          value={cameraForm.streamUrl}
          onChange={(event) => setCameraForm((prev) => ({ ...prev, streamUrl: event.target.value }))}
        />
        <div className="style-row">
          <input
            className="text-input"
            placeholder="Latitude"
            value={cameraForm.lat}
            onChange={(event) => setCameraForm((prev) => ({ ...prev, lat: event.target.value }))}
          />
          <input
            className="text-input"
            placeholder="Longitude"
            value={cameraForm.lng}
            onChange={(event) => setCameraForm((prev) => ({ ...prev, lng: event.target.value }))}
          />
        </div>
        <div className="control-actions">
          <button
            type="button"
            className={pickCameraLocation ? 'primary-button picking' : 'primary-button'}
            onClick={togglePickCameraLocation}
          >
            {pickCameraLocation ? 'Click on map…' : 'Pick from map'}
          </button>
          <button type="button" className="primary-button" onClick={handleAddCamera}>
            Add camera
          </button>
        </div>
      </div>
      <div>
        <p className="panel-section-label">Cameras</p>
        {cameras.length === 0 ? (
          <p className="empty-state">No cameras yet.</p>
        ) : (
          cameras.map((camera) => (
            <div key={camera.id} className="camera-row info-hover">
              <div>
                {cameraRenameId === camera.id ? (
                  <input
                    value={cameraRenameDraft}
                    onChange={(event) => setCameraRenameDraft(event.target.value)}
                    onBlur={commitCameraRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        commitCameraRename()
                      } else if (event.key === 'Escape') {
                        setCameraRenameId(null)
                      }
                    }}
                  />
                ) : (
                  <p onDoubleClick={() => beginCameraRename(camera)}>{camera.name}</p>
                )}
                <small>{camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</small>
              </div>
              <div className="camera-actions">
                <button type="button" onClick={() => handleFocusCamera(camera)}>
                  Focus
                </button>
                <button type="button" onClick={() => handlePreviewCamera(camera)}>
                  Preview
                </button>
                <button type="button" onClick={() => handleRemoveCamera(camera.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
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
    if (panelPage === 'camera') {
      return renderCameraPage()
    }
    return renderFarmPage()
  }

  const renderCameraPreviewWindow = () => {
    if (!cameraPreview) {
      return null
    }
    return (
      <Draggable defaultPosition={{ x: cameraPreview.x ?? 220, y: cameraPreview.y ?? 220 }} nodeRef={cameraPreviewRef}>
        <div ref={cameraPreviewRef} className="camera-preview-window">
          <div className="camera-preview-header">
            <p>{cameraPreview.camera.name}</p>
            <button type="button" onClick={() => setCameraPreview(null)}>
              ×
            </button>
          </div>
          <div className="camera-preview-body">
            <iframe
              title={cameraPreview.camera.name}
              src={cameraPreview.camera.streamUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
            />
            <a href={cameraPreview.camera.streamUrl} target="_blank" rel="noreferrer">
              Open stream
            </a>
          </div>
        </div>
      </Draggable>
    )
  }

  const renderMapHoverInfo = () => {
    if (!mapHoverInfo) {
      return null
    }
    const properties = mapHoverInfo.feature.properties ?? {}
    const prioritized = DEFAULT_HOVER_FIELDS.filter((field) => properties?.[field] !== undefined && properties?.[field] !== null)

    const rows =
      prioritized.length > 0
        ? prioritized.map((field) => (
            <div key={field}>
              <span className="hover-key">{field}</span>
              <span className="hover-value">{String(properties[field])}</span>
            </div>
          ))
        : Object.entries(properties)
            .slice(0, 3)
            .map(([field, value]) => (
              <div key={field}>
                <span className="hover-key">{field}</span>
                <span className="hover-value">{String(value)}</span>
              </div>
            ))

    if (!rows.length) {
      return null
    }

    return (
      <div className="map-hover-card" style={{ left: mapHoverInfo.x + 12, top: mapHoverInfo.y + 12 }}>
        {rows}
      </div>
    )
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

      <div className="status-bar">
        <span className="status-message">&gt; {activityMessage}</span>
        <span className="status-coords">
          {latLabel} · {lngLabel}
        </span>
      </div>

      <div className="map-panel">
        <div ref={mapContainerRef} className="map-canvas" />

        <Draggable handle=".panel-drag-handle" nodeRef={panelRef}>
          <div ref={panelRef} className="control-panel">
            <div className="panel-header">
              <button type="button" className="panel-drag-handle" aria-label="Drag panel">
                <span aria-hidden="true">⤧</span>
              </button>
              <div className="panel-tabs">
                {[
                  { id: 'farm', label: 'My Farm' },
                  { id: 'layers', label: 'Layers' },
                  { id: 'settings', label: 'Settings' },
                  { id: 'camera', label: 'Camera' },
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
            {panelPage === 'layers' && layerTooltip ? (
              <div className="layer-tooltip" style={{ left: layerTooltip.x, top: layerTooltip.y }}>
                {layerTooltip.details}
              </div>
            ) : null}
          </div>
        </Draggable>

        {renderMapHoverInfo()}
        {renderCameraPreviewWindow()}
      </div>
    </div>
  )
}

export default App
