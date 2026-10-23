import { useEffect, useRef, useState } from 'react'
import type { PathResult, Point, Report, SafetyRecord, Segment } from '../../api/types'
import { errorMessage } from '../../api/client'
import { ErrorNotice } from '../../components/ui'
import { loadKakaoMaps } from './kakao'

export interface Bounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}
export interface MapView {
  center: Point
  level: number
}
export interface SafetyMapProps {
  initialView?: MapView
  onViewChange?: (view: MapView) => void
  positionAccuracy?: number | null
  focus?: Point | null
  currentPosition: Point | null
  position: Point | null
  start: Point | null
  end: Point | null
  segments: Segment[]
  reports: Report[]
  records: SafetyRecord[]
  route: PathResult | null
  onSelect: (point: Point) => void
  onBounds: (bounds: Bounds) => void
}
const colors = { SAFE: '#19815f', CAUTION: '#d6a422', DANGER: '#d64e4e' }
export default function SafetyMap(props: SafetyMapProps) {
  const initialView = useRef(props.initialView)
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<kakao.maps.Map | null>(null)
  const callbacks = useRef({
    onSelect: props.onSelect,
    onBounds: props.onBounds,
    onViewChange: props.onViewChange,
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const centered = useRef<'current' | 'robot' | null>(null)
  useEffect(() => {
    callbacks.current = {
      onSelect: props.onSelect,
      onBounds: props.onBounds,
      onViewChange: props.onViewChange,
    }
  }, [props.onSelect, props.onBounds, props.onViewChange])
  useEffect(() => {
    let active = true
    let cleanup = () => {}
    setError('')
    loadKakaoMaps()
      .then((maps) => {
        if (!active || !container.current) return
        const center = initialView.current?.center
        const instance = new maps.Map(container.current, {
          center: new maps.LatLng(center?.latitude ?? 37.5665, center?.longitude ?? 126.978),
          level: initialView.current?.level ?? 4,
        })
        if (initialView.current) centered.current = 'current'
        map.current = instance
        const click = (event: kakao.maps.event.MouseEvent) =>
          callbacks.current.onSelect({
            latitude: event.latLng.getLat(),
            longitude: event.latLng.getLng(),
          })
        const bounds = () => {
          if (callbacks.current.onViewChange) {
            const center = instance.getCenter()
            callbacks.current.onViewChange({
              center: { latitude: center.getLat(), longitude: center.getLng() },
              level: instance.getLevel(),
            })
          }
          const box = instance.getBounds()
          callbacks.current.onBounds({
            swLat: box.getSouthWest().getLat(),
            swLng: box.getSouthWest().getLng(),
            neLat: box.getNorthEast().getLat(),
            neLng: box.getNorthEast().getLng(),
          })
        }
        maps.event.addListener(instance, 'click', click)
        maps.event.addListener(instance, 'idle', bounds)
        const resize = new ResizeObserver(() => instance.relayout())
        resize.observe(container.current)
        cleanup = () => {
          maps.event.removeListener(instance, 'click', click)
          maps.event.removeListener(instance, 'idle', bounds)
          resize.disconnect()
          map.current = null
        }
        setReady(true)
        bounds()
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
      cleanup()
      centered.current = null
    }
  }, [revision])
  useEffect(() => {
    if (!ready || !map.current) return
    const maps = window.kakao.maps
    const overlays: { setMap: (map: kakao.maps.Map | null) => void }[] = []
    const latLng = (point: Point) => new maps.LatLng(point.latitude, point.longitude)
    props.segments.forEach((segment) => {
      overlays.push(
        new maps.Polyline({
          map: map.current!,
          path: segment.path.map(latLng),
          strokeWeight: 5,
          strokeColor: colors[segment.level],
          strokeOpacity: 0.75,
        }),
      )
    })
    if (props.route)
      overlays.push(
        new maps.Polyline({
          map: map.current,
          path: props.route.path.map(latLng),
          strokeWeight: 7,
          strokeColor: '#4565df',
          strokeOpacity: 0.95,
        }),
      )
    const marker = (point: Point, label: string, color: string) => {
      const content = document.createElement('span')
      content.className = 'map-label'
      content.style.background = color
      content.textContent = label
      overlays.push(
        new maps.CustomOverlay({
          map: map.current!,
          position: latLng(point),
          content,
          yAnchor: 1.3,
        }),
      )
    }
    props.records.forEach((record) =>
      overlays.push(
        new maps.Circle({
          map: map.current!,
          center: latLng(record),
          radius: 2,
          strokeWeight: 0,
          fillColor: colors[record.risk.level],
          fillOpacity: 0.6,
        }),
      ),
    )
    props.reports.forEach((report) => marker(report, `신고 #${report.id}`, '#9d4938'))
    if (props.position) {
      marker(props.position, '로보독', '#13765b')
    }
    if (props.currentPosition)
      marker(
        props.currentPosition,
        props.positionAccuracy != null && props.positionAccuracy > 100
          ? '대략적인 현재 위치'
          : '현재 위치',
        '#234cba',
      )
    if (props.start) marker(props.start, '출발', '#234cba')
    if (props.end) marker(props.end, '도착', '#7136a3')
    return () => overlays.forEach((overlay) => overlay.setMap(null))
  }, [
    ready,
    props.currentPosition,
    props.positionAccuracy,
    props.position,
    props.start,
    props.end,
    props.segments,
    props.reports,
    props.records,
    props.route,
  ])
  useEffect(() => {
    if (!ready || !map.current || props.route || props.focus || centered.current === 'current')
      return
    const position = props.currentPosition ?? props.position
    if (!position || (!props.currentPosition && centered.current === 'robot')) return
    map.current.setCenter(new window.kakao.maps.LatLng(position.latitude, position.longitude))
    centered.current = props.currentPosition ? 'current' : 'robot'
  }, [ready, props.currentPosition, props.position, props.route, props.focus])
  useEffect(() => {
    if (!ready || !map.current || !props.focus) return
    map.current.setCenter(new window.kakao.maps.LatLng(props.focus.latitude, props.focus.longitude))
  }, [ready, props.focus])
  useEffect(() => {
    if (!ready || !map.current || !props.route?.path.length) return
    const bounds = new window.kakao.maps.LatLngBounds()
    props.route.path.forEach((point) =>
      bounds.extend(new window.kakao.maps.LatLng(point.latitude, point.longitude)),
    )
    map.current.setBounds(bounds)
  }, [ready, props.route])
  return (
    <div className="map-container">
      <div
        ref={container}
        className="map-canvas"
        aria-label="위험 구간과 경로를 표시하는 카카오 지도"
      />
      {error && (
        <div className="map-error">
          <ErrorNotice
            message={error}
            retry={() => {
              setReady(false)
              setRevision(revision + 1)
            }}
          />
        </div>
      )}
      {!ready && !error && <div className="map-loading">지도를 불러오는 중입니다.</div>}
    </div>
  )
}
