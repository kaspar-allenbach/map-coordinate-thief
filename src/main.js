import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.pm/dist/leaflet.pm.css'
import 'leaflet.pm'

// helper: random pastel color
function randomColor(){
  const h = Math.floor(Math.random()*360)
  return `hsl(${h} 70% 70% / 1)`
}

const map = L.map('map', { center: [46.8, 8.33], zoom: 7 })

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map)

// enable leaflet.pm globally
map.pm.addControls({
  position: 'topleft',
  drawMarker: true,        // keep enabled
  drawPolygon: true,       // keep enabled
  drawPolyline: false,      // keep enabled
  drawCircle: true,        // keep enabled
  drawCircleMarker: false, // explicitly disable CircleMarker
  editMode: true,
  dragMode: true,
  cutPolygon: false,
  removalMode: true,
})




const featuresLayer = L.featureGroup().addTo(map) // holds markers and polygons

// maintain a map of leaflet layer id -> feature metadata
const meta = new Map()

function geojsonFromLayers(){
  const features = []

  featuresLayer.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const coords = layer.getLatLng()
      // simple coordinates output for markers
      features.push([coords.lat, coords.lng])
    } else if (layer instanceof L.Circle) {
      const coords = layer.getLatLng()
      features.push({
        type: 'Feature',
        properties: { type: 'circle', radius: layer.getRadius() },
        geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }
      })
    } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      const geo = layer.toGeoJSON().geometry
      features.push({
        type: 'Feature',
        properties: Object.assign(
          { type: layer instanceof L.Polygon ? 'polygon' : 'polyline' },
          meta.get(layer._leaflet_id) || {}
        ),
        geometry: geo
      })
    }
  })

  return features
}
function highlightJSON(json) {
  if (!json) return ''
  return JSON.stringify(json, null, 2)
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|(\b(true|false|null)\b)|(-?\d+\.?\d*)/g,
      match => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) return `<span class="key">${match}</span>` // key
          return `<span class="string">${match}</span>`                   // string value
        } else if (/true|false/.test(match)) {
          return `<span class="boolean">${match}</span>`
        } else if (/null/.test(match)) {
          return `<span class="null">${match}</span>`
        } else {
          return `<span class="number">${match}</span>`                  // number
        }
      })
}



function updateViewer(){
  const geojsonEl = document.getElementById('geojson-viewer')
  const markerEl = document.getElementById('marker-viewer')

  const geoFeatures = []
  const markerCoords = []

  featuresLayer.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const coords = layer.getLatLng()
      markerCoords.push([coords.lat, coords.lng])
    } else if (layer instanceof L.Circle) {
      const coords = layer.getLatLng()
      geoFeatures.push({
        type: 'Feature',
        properties: { type: 'circle', radius: layer.getRadius() },
        geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] }
      })
    } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
      const geo = layer.toGeoJSON().geometry
      geoFeatures.push({
        type: 'Feature',
        properties: Object.assign(
          { type: layer instanceof L.Polygon ? 'polygon' : 'polyline' },
          meta.get(layer._leaflet_id) || {}
        ),
        geometry: geo
      })
    }
  })

  geojsonEl.innerHTML = highlightJSON(geoFeatures)
  markerEl.innerHTML = highlightJSON({ markers: markerCoords })
}






// create marker via clicking on map when 'add marker' mode enabled
let addingMarker = false
let drawingPolygon = false

const btnDrawPolygon = document.getElementById('btn-draw-polygon')
const btnAddMarker = document.getElementById('btn-add-marker')
const btnClearAll = document.getElementById('btn-clear-all')
const btnCopy = document.getElementById('btn-copy')
const btnDownload = document.getElementById('btn-download')
const btnDrawPolyline = document.getElementById('btn-draw-polyline')
const btnDrawCircle = document.getElementById('btn-draw-circle')

btnDrawPolygon.addEventListener('click', ()=>{
  drawingPolygon = !drawingPolygon
  addingMarker = false
  toggleButtonActive(btnDrawPolygon, drawingPolygon)
  toggleButtonActive(btnAddMarker, false)
  if (drawingPolygon){
    map.pm.enableDraw('Polygon', { snappable: true, allowSelfIntersection: false })
  } else {
    map.pm.disableDraw('Polygon')
  }
})

btnDrawPolyline.addEventListener('click', () => {
  addingMarker = false
  toggleButtonActive(btnAddMarker, false)
  toggleButtonActive(btnDrawPolygon, false)
  toggleButtonActive(btnDrawCircle, false)

  toggleButtonActive(btnDrawPolyline, !map.pm.Draw.Polyline.enabled())
  if (map.pm.Draw.Polyline.enabled()) {
    map.pm.disableDraw('Polyline')
  } else {
    map.pm.enableDraw('Polyline', { snappable: true })
  }
})

btnDrawCircle.addEventListener('click', () => {
  addingMarker = false
  toggleButtonActive(btnAddMarker, false)
  toggleButtonActive(btnDrawPolygon, false)
  toggleButtonActive(btnDrawPolyline, false)

  toggleButtonActive(btnDrawCircle, !map.pm.Draw.Circle.enabled())
  if (map.pm.Draw.Circle.enabled()) {
    map.pm.disableDraw('Circle')
  } else {
    map.pm.enableDraw('Circle', { snappable: true })
  }
})


btnAddMarker.addEventListener('click', ()=>{
  addingMarker = !addingMarker
  drawingPolygon = false
  toggleButtonActive(btnAddMarker, addingMarker)
  toggleButtonActive(btnDrawPolygon, false)
  map.pm.disableDraw('Polygon')
})

btnDrawPolyline.addEventListener('click', () => {
  drawingPolygon = false
  addingMarker = false
  toggleButtonActive(btnDrawPolygon, false)
  toggleButtonActive(btnAddMarker, false)
  toggleButtonActive(btnDrawPolyline, !map.pm.Draw.Polyline.enabled())

  if (map.pm.Draw.Polyline.enabled()) {
    map.pm.disableDraw('Polyline')
  } else {
    map.pm.enableDraw('Polyline', { snappable: true })
  }
})


function toggleButtonActive(btn, on){
  if (on) btn.style.background = '#eef2ff'
  else btn.style.background = '#fff'
}

map.on('pm:create', e => {
  const layer = e.layer

  if (layer instanceof L.Marker) {
    featuresLayer.addLayer(layer)
    layer.on('dragend', updateViewer)
    layer.on('dblclick', () => {
      featuresLayer.removeLayer(layer)
      updateViewer()
    })
  }

  if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
    const color = randomColor()
    layer.setStyle({ color, weight: 3, opacity: 0.9 })

    featuresLayer.addLayer(layer)
    meta.set(layer._leaflet_id, { color })
    layer.pm.enable({ allowSelfIntersection: false })

    layer.on('pm:edit', updateViewer)
    layer.on('pm:remove', () => {
      meta.delete(layer._leaflet_id)
      updateViewer()
    })
  }

  if (layer instanceof L.Circle) {
    featuresLayer.addLayer(layer)
    layer.pm.enable()
    layer.on('pm:edit', updateViewer)
    layer.on('pm:remove', updateViewer)
  }

  updateViewer()
})



map.on('click', e => {
  if (!addingMarker) return

  const coords = e.latlng
  const marker = L.marker(coords, { draggable: true })
  featuresLayer.addLayer(marker)   // <- ensures it’s in the layer group

  // update marker viewer on drag
  marker.on('dragend', updateViewer)

  // double-click to remove
  marker.on('dblclick', () => {
    featuresLayer.removeLayer(marker)
    updateViewer()
  })

  updateViewer()
})


btnClearAll.addEventListener('click', ()=>{
  featuresLayer.clearLayers()
  meta.clear()
  updateViewer()
})

// copy to clipboard
btnCopy.addEventListener('click', async ()=>{
  const txt = document.getElementById('geojson-viewer').textContent
  try{
    await navigator.clipboard.writeText(txt)
    showFlash('Copied to clipboard')
  }catch(e){
    showFlash('Copy failed — select and copy manually')
  }
})

btnDownload.addEventListener('click', ()=>{
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(document.getElementById('geojson-viewer').textContent)
  const a = document.createElement('a')
  a.href = dataStr
  a.download = 'data.geojson'
  a.click()
})

// When anything in featuresLayer changes, update viewer
featuresLayer.on('layeradd', updateViewer)
featuresLayer.on('layerremove', updateViewer)

// helper flash
function showFlash(msg){
  const el = document.createElement('div')
  el.textContent = msg
  el.style.position = 'fixed'
  el.style.bottom = '20px'
  el.style.right = '20px'
  el.style.padding = '10px 14px'
  el.style.background = '#111827'
  el.style.color = '#fff'
  el.style.borderRadius = '8px'
  document.body.appendChild(el)
  setTimeout(()=>el.remove(),1600)
}

// allow dragging polygon vertices to update coordinates — leaflet.pm triggers pm:edit
// also allow editing shapes by toggling edit mode when clicking the polygon
map.on('pm:globaleditmodetoggled', updateViewer)

// small UX: show lat/lng for markers inside viewer (the geojson output already contains [lng,lat])
// Add instruction: double-click a marker to remove it

updateViewer()

// make sure map invalidates size on load
setTimeout(()=>map.invalidateSize(),300)

// keyboard shortcuts
window.addEventListener('keydown',(e)=>{
  if (e.key === 'Escape'){
    addingMarker = false
    drawingPolygon = false
    toggleButtonActive(btnAddMarker,false); toggleButtonActive(btnDrawPolygon,false)
    map.pm.disableDraw('Polygon')
  }
})

// ensure all coordinates are in WGS84: Leaflet uses WGS84 (EPSG:4326) for lat/lng; map projection is WebMercator for tiles — coordinates output are in WGS84 when using toGeoJSON and getLatLng

// End of main.js