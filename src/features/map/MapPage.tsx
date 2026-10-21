import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import type { PathMode, PathResult, Point, SafetyRecord, Segment } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, number, PageTitle, riskNames } from '../../components/ui'
import SafetyMap, { type Bounds } from './SafetyMap'

export default function MapPage() {
  const { api, status, history, reports } = useRobot()
  const [segments, setSegments] = useState<Segment[]>([])
  const [records, setRecords] = useState<SafetyRecord[]>([])
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [start, setStart] = useState<Point | null>(null)
  const [end, setEnd] = useState<Point | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [mode, setMode] = useState<PathMode>('SAFEST')
  const [route, setRoute] = useState<PathResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [recordsError, setRecordsError] = useState('')
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null)
  const [locationMessage, setLocationMessage] = useState('현재 위치를 확인하고 있습니다.')
  const [revision, setRevision] = useState(0)
  const searchRevision = useRef(0)
  const onBounds = useCallback((value: Bounds) => setBounds(value), [])
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage('현재 위치를 지원하지 않는 브라우저입니다. 기본 위치로 표시합니다.')
      return
    }
    let active = true
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!active) return
        setCurrentPosition({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationMessage('현재 위치를 기준으로 지도를 표시합니다.')
      },
      (error) => {
        if (!active) return
        setLocationMessage(
          error.code === 1
            ? '위치 권한이 거부되었습니다. 기본 위치로 표시합니다. 브라우저 설정에서 위치를 허용해주세요.'
            : '현재 위치를 확인하지 못했습니다. 기본 위치로 표시합니다.',
        )
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    )
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setMapError('')
    api
      .segments(controller.signal)
      .then(setSegments)
      .catch((error) => {
        if (!controller.signal.aborted) setMapError(errorMessage(error))
      })
    return () => controller.abort()
  }, [api, revision])
  useEffect(() => {
    if (!bounds) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      api
        .records(bounds, controller.signal)
        .then((data) => {
          setRecords(data)
          setRecordsError('')
        })
        .catch((error) => {
          if (!controller.signal.aborted) setRecordsError(errorMessage(error))
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [api, bounds, revision])
  const position = useMemo(
    () =>
      status.latitude == null || status.longitude == null
        ? null
        : { latitude: status.latitude, longitude: status.longitude },
    [status.latitude, status.longitude],
  )
  const liveSegments = useMemo(() => {
    const recent: Segment[] = []
    history.forEach((record, i) => {
      const previous = history[i - 1]
      if (
        !previous ||
        previous.latitude == null ||
        previous.longitude == null ||
        record.latitude == null ||
        record.longitude == null ||
        new Date(record.recordedAt).getTime() - new Date(previous.recordedAt).getTime() > 5000
      )
        return
      recent.push({
        level: record.risk.level,
        path: [
          { latitude: previous.latitude, longitude: previous.longitude },
          { latitude: record.latitude, longitude: record.longitude },
        ],
      })
    })
    return [...segments, ...recent]
  }, [segments, history])
  function invalidateRoute() {
    searchRevision.current++
    setRoute(null)
    setError('')
    setLoading(false)
  }
  const selectPoint = (point: Point) => {
    invalidateRoute()
    if (selecting === 'start') {
      setStart(point)
      setSelecting('end')
    } else setEnd(point)
  }
  async function search() {
    if (!start || !end) return
    const currentSearch = ++searchRevision.current
    setLoading(true)
    setError('')
    setRoute(null)
    try {
      const result = await api.searchPath(start, end, mode)
      if (currentSearch === searchRevision.current) setRoute(result)
    } catch (error) {
      if (currentSearch === searchRevision.current) setError(errorMessage(error))
    } finally {
      if (currentSearch === searchRevision.current) setLoading(false)
    }
  }
  return (
    <>
      <PageTitle
        title="안전 지도"
        description="로보독이 지나간 길의 위험도와 안전한 이동 경로를 확인하세요."
        action={<button onClick={() => setRevision(revision + 1)}>지도 데이터 새로고침</button>}
      />
      <ErrorNotice message={mapError || recordsError} retry={() => setRevision(revision + 1)} />
      <div className="map-layout">
        <section className="panel map-panel">
          <div className="map-legend">
            <span className="safe">● 안전</span>
            <span className="caution">● 주의</span>
            <span className="danger">● 위험</span>
            <span>● 보라색: 탐색 경로</span>
          </div>
          <SafetyMap
            currentPosition={currentPosition}
            position={position}
            start={start}
            end={end}
            segments={liveSegments}
            reports={reports}
            records={records}
            route={route}
            onSelect={selectPoint}
            onBounds={onBounds}
          />
          <p className="muted" role="status">
            {locationMessage}
          </p>
          <p className="muted">
            지도를 눌러 {selecting === 'start' ? '출발지' : '도착지'}를 선택하세요. 로보독 표시는
            마지막 수신 위치입니다.
          </p>
        </section>
        <aside className="panel">
          <h2>경로 탐색</h2>
          <p>수집된 길 안에서 경로를 탐색합니다.</p>
          <div className="route-points">
            <button aria-pressed={selecting === 'start'} onClick={() => setSelecting('start')}>
              <strong>출발지 선택</strong>
              <small>
                {start
                  ? `${start.latitude.toFixed(5)}, ${start.longitude.toFixed(5)}`
                  : '지도를 눌러 선택'}
              </small>
            </button>
            <button aria-pressed={selecting === 'end'} onClick={() => setSelecting('end')}>
              <strong>도착지 선택</strong>
              <small>
                {end
                  ? `${end.latitude.toFixed(5)}, ${end.longitude.toFixed(5)}`
                  : '지도를 눌러 선택'}
              </small>
            </button>
          </div>
          <button
            disabled={!position}
            onClick={() => {
              invalidateRoute()
              setStart(position)
              setSelecting('end')
            }}
          >
            마지막 로보독 위치에서 출발
          </button>
          <label>
            탐색 방식
            <select
              value={mode}
              onChange={(e) => {
                invalidateRoute()
                setMode(e.target.value as PathMode)
              }}
            >
              <option value="SAFEST">안전 우선</option>
              <option value="SHORTEST">최단 거리</option>
            </select>
          </label>
          <p className="muted">
            안전 우선은 위험 구간을 피합니다. 최단 거리는 위험도를 고려하지 않습니다.
          </p>
          <button
            className="primary full-width"
            disabled={!start || !end || loading}
            onClick={() => void search()}
          >
            {loading ? '경로 탐색 중…' : '경로 찾기'}
          </button>
          <ErrorNotice message={error} />
          {route && (
            <dl className="details">
              <div>
                <dt>총 거리</dt>
                <dd>{number(route.distanceMeters, ' m')}</dd>
              </div>
              <div>
                <dt>평균 위험도</dt>
                <dd>{number(route.averageRiskScore)} / 5</dd>
              </div>
              <div>
                <dt>최고 위험 등급</dt>
                <dd>{riskNames[route.maxRiskLevel]}</dd>
              </div>
            </dl>
          )}
          <p className="muted">
            출발·도착지는 30m 안의 수집 지점에 연결됩니다. 길이 충분히 수집되지 않았으면 경로가 없을
            수 있습니다.
          </p>
        </aside>
      </div>
    </>
  )
}
