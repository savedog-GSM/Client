import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import type {
  PathMode,
  PathResult,
  Point,
  SafetyRecord,
  Segment,
  WalkingRoute,
} from '../../api/types'
import RouteModeSelect from './RouteModeSelect'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, number, PageTitle, riskNames } from '../../components/ui'
import { type Bounds } from './SafetyMap'
import ExpandableMap from './ExpandableMap'
import AddressSearch from './AddressSearch'
import { usePointAddress, type AddressPoint } from './usePointAddress'
import { demoPosition } from '../demo/session'
import { searchWalkingRoute } from './walkingRoute'
import { routeErrorMessage } from './routeErrors'
import { kakaoRouteUrl } from './kakaoRouteUrl'

export default function MapPage() {
  const { api, status, history, reports, demo } = useRobot()
  const [segments, setSegments] = useState<Segment[]>([])
  const [records, setRecords] = useState<SafetyRecord[]>([])
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [start, setStart] = useState<AddressPoint | null>(null)
  const [end, setEnd] = useState<AddressPoint | null>(null)
  const startLabel = usePointAddress(start)
  const endLabel = usePointAddress(end)
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [focus, setFocus] = useState<Point | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [mode, setMode] = useState<PathMode>('SAFEST')
  const [routeSource, setRouteSource] = useState<'KAKAO' | 'COLLECTED'>('KAKAO')
  const [route, setRoute] = useState<PathResult | WalkingRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [recordsError, setRecordsError] = useState('')
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null)
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(true)
  const [locationRevision, setLocationRevision] = useState(0)
  const [locationMessage, setLocationMessage] = useState('현재 위치를 확인하고 있습니다.')
  const [revision, setRevision] = useState(0)
  const searchRevision = useRef(0)
  const routeRequest = useRef<AbortController | null>(null)
  useEffect(() => () => routeRequest.current?.abort(), [])
  const onBounds = useCallback((value: Bounds) => setBounds(value), [])
  useEffect(() => {
    if (demo) {
      setCurrentPosition(demoPosition)
      setPositionAccuracy(3)
      setLocating(false)
      setLocationMessage(
        '시연용 위치를 표시합니다. 경로는 실제 보행 안내에 사용할 수 없는 예시입니다.',
      )
      return
    }
    setCurrentPosition(null)
    setPositionAccuracy(null)
    setLocating(true)
    setLocationMessage('현재 위치를 확인하고 있습니다.')
    if (!navigator.geolocation) {
      setLocationMessage('현재 위치를 지원하지 않는 브라우저입니다. 기본 위치로 표시합니다.')
      setLocating(false)
      return
    }
    let active = true
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!active) return
        const point = { latitude: coords.latitude, longitude: coords.longitude }
        setCurrentPosition(point)
        setPositionAccuracy(Number.isFinite(coords.accuracy) ? coords.accuracy : null)
        setLocating(false)
        if (locationRevision > 0) setFocus((previous) => previous ?? point)
        setLocationMessage('현재 위치를 기준으로 지도를 표시합니다.')
      },
      (error) => {
        if (!active) return
        setLocating(false)
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
  }, [locationRevision, demo])
  useEffect(() => {
    setMapError('')
    if (routeSource !== 'COLLECTED') {
      setSegments([])
      return
    }
    const controller = new AbortController()
    api
      .segments(controller.signal)
      .then(setSegments)
      .catch((error) => {
        if (!controller.signal.aborted) setMapError(errorMessage(error))
      })
    return () => controller.abort()
  }, [api, revision, routeSource])
  useEffect(() => {
    if (!bounds || routeSource !== 'COLLECTED') {
      setRecords([])
      setRecordsError('')
      return
    }
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
  }, [api, bounds, revision, routeSource])
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
    routeRequest.current?.abort()
    searchRevision.current++
    setRoute(null)
    setError('')
    setLoading(false)
  }
  const selectPoint = (point: Point) => {
    invalidateRoute()
    if (selecting === 'start') {
      setStart(point)
      setStartAddress('지도에서 선택한 위치')
      setSelecting('end')
    } else {
      setEnd(point)
      setEndAddress('지도에서 선택한 위치')
    }
  }
  async function search() {
    if (!start || !end) return
    const currentSearch = ++searchRevision.current
    routeRequest.current?.abort()
    const controller = new AbortController()
    routeRequest.current = controller
    setLoading(true)
    setError('')
    setRoute(null)
    try {
      let result: PathResult | WalkingRoute
      if (routeSource === 'KAKAO' && !demo) {
        result = await searchWalkingRoute(
          start,
          end,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        )
      } else {
        const collected = await api.searchPath(
          { latitude: start.latitude, longitude: start.longitude },
          { latitude: end.latitude, longitude: end.longitude },
          mode,
        )
        result =
          routeSource === 'KAKAO'
            ? {
                provider: 'KAKAO',
                path: collected.path,
                distanceMeters: collected.distanceMeters,
                durationSeconds: Math.ceil(collected.distanceMeters / 1.2),
                steps: [],
              }
            : collected
      }
      if (currentSearch === searchRevision.current) setRoute(result)
    } catch (error) {
      if (currentSearch === searchRevision.current) setError(routeErrorMessage(error))
    } finally {
      if (currentSearch === searchRevision.current) setLoading(false)
    }
  }
  return (
    <>
      <PageTitle
        title="도보 길찾기"
        description="카카오 도보 경로와 로보독이 수집한 길을 구분해 확인하세요."
        action={<button onClick={() => setRevision(revision + 1)}>지도 데이터 새로고침</button>}
      />
      <ErrorNotice message={mapError || recordsError} retry={() => setRevision(revision + 1)} />
      <div className="map-layout">
        <section className="panel map-panel">
          <div className="map-legend">
            {routeSource === 'COLLECTED' && (
              <>
                <span className="safe">● 안전</span>
                <span className="caution">● 주의</span>
                <span className="danger">● 위험</span>
              </>
            )}
            <span>● 보라색: {routeSource === 'KAKAO' ? '카카오 도보 경로' : '수집 경로'}</span>
          </div>
          <ExpandableMap
            focus={focus}
            currentPosition={currentPosition}
            positionAccuracy={positionAccuracy}
            position={position}
            start={start}
            end={end}
            segments={routeSource === 'COLLECTED' ? liveSegments : []}
            reports={reports}
            records={records}
            route={route}
            onSelect={selectPoint}
            onBounds={onBounds}
          />
          <p className="muted" role="status">
            {locationMessage}
          </p>
          {positionAccuracy !== null && (
            <p className="muted" role="status">
              위치 오차 범위: 약 {Math.ceil(positionAccuracy).toLocaleString('ko-KR')}m.
              {positionAccuracy > 100 &&
                ' 대략적인 위치입니다. PC에서는 실제 위치와 멀리 떨어질 수 있어요. 정확한 출발지는 주소 검색으로 선택해주세요.'}
            </p>
          )}
          <button
            type="button"
            disabled={locating}
            onClick={() => {
              if (startAddress === '현재 위치') {
                invalidateRoute()
                setStart(null)
                setStartAddress('')
              }
              setFocus(null)
              setLocationRevision((value) => value + 1)
            }}
          >
            {locating ? '위치 확인 중…' : '현재 위치 다시 확인'}
          </button>
          <p className="muted">
            지도를 눌러 {selecting === 'start' ? '출발지' : '도착지'}를 선택하세요. 로보독 표시는
            마지막 수신 위치입니다.
          </p>
        </section>
        <aside className="panel">
          <h2>경로 탐색</h2>
          <fieldset className="route-source">
            <legend>길찾기 종류</legend>
            <label>
              <input
                type="radio"
                name="route-source"
                checked={routeSource === 'KAKAO'}
                onChange={() => {
                  invalidateRoute()
                  setRouteSource('KAKAO')
                }}
              />
              카카오 도보
            </label>
            <label>
              <input
                type="radio"
                name="route-source"
                checked={routeSource === 'COLLECTED'}
                onChange={() => {
                  invalidateRoute()
                  setRouteSource('COLLECTED')
                }}
              />
              수집 경로
            </label>
          </fieldset>
          <p>
            {routeSource === 'KAKAO'
              ? '일반 보행 도로에서 도보 경로를 찾습니다.'
              : '로보독이 실제로 수집한 길 안에서만 탐색합니다.'}
          </p>
          <AddressSearch
            label="출발지 주소"
            value={start ? startLabel : startAddress}
            onChange={(value) => {
              invalidateRoute()
              setStartAddress(value)
              setStart(null)
            }}
            onSelect={(location) => {
              invalidateRoute()
              setStart({
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
              })
              setStartAddress(location.name)
              setFocus(location)
              setSelecting('end')
            }}
          />
          <button
            className="current-start"
            disabled={!currentPosition}
            onClick={() => {
              invalidateRoute()
              setStart(currentPosition)
              setStartAddress('현재 위치')
              setFocus(currentPosition)
              setSelecting('end')
            }}
          >
            현재 위치에서 출발
          </button>
          <AddressSearch
            label="도착지 주소"
            value={end ? endLabel : endAddress}
            onChange={(value) => {
              invalidateRoute()
              setEndAddress(value)
              setEnd(null)
            }}
            onSelect={(location) => {
              invalidateRoute()
              setEnd({
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
              })
              setEndAddress(location.name)
              setFocus(location)
            }}
          />
          <div className="route-points">
            <button aria-pressed={selecting === 'start'} onClick={() => setSelecting('start')}>
              <strong>출발지 선택</strong>
              <small>{start ? startLabel : '지도를 눌러 선택'}</small>
            </button>
            <button aria-pressed={selecting === 'end'} onClick={() => setSelecting('end')}>
              <strong>도착지 선택</strong>
              <small>{end ? endLabel : '지도를 눌러 선택'}</small>
            </button>
          </div>
          {routeSource === 'COLLECTED' && (
            <>
              <RouteModeSelect
                value={mode}
                onChange={(value) => {
                  invalidateRoute()
                  setMode(value)
                }}
              />
              <p className="muted">
                안전 우선은 위험 구간을 피합니다. 최단 거리는 위험도를 고려하지 않습니다.
              </p>
            </>
          )}
          <button
            className="primary full-width"
            disabled={!start || !end || loading}
            onClick={() => void search()}
          >
            {loading ? '경로 탐색 중…' : '경로 찾기'}
          </button>
          <ErrorNotice message={error} />
          {start && end && !demo && (
            <div className="route-external">
              <a href={kakaoRouteUrl(start, end)} target="_blank" rel="noopener noreferrer">
                카카오맵 도보 길찾기 열기 ↗
              </a>
              <p className="muted">
                새 창에서 일반 보행 경로를 확인합니다. 로보독의 위험도 기록은 반영되지 않습니다.
              </p>
            </div>
          )}
          {route && (
            <dl className="details">
              <div>
                <dt>총 거리</dt>
                <dd>{number(route.distanceMeters, ' m')}</dd>
              </div>
              {'provider' in route ? (
                <div>
                  <dt>{demo ? '예상 시간 (시연용)' : '예상 도보 시간'}</dt>
                  <dd>약 {Math.ceil(route.durationSeconds / 60)}분</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt>평균 위험도</dt>
                    <dd>{number(route.averageRiskScore)} / 5</dd>
                  </div>
                  <div>
                    <dt>최고 위험 등급</dt>
                    <dd>{riskNames[route.maxRiskLevel]}</dd>
                  </div>
                </>
              )}
            </dl>
          )}
          {route && 'provider' in route && route.steps.length > 0 && (
            <ol className="walking-steps">
              {route.steps.map((step, index) => (
                <li key={index}>
                  <span>{step.instruction}</span>
                  <small>{number(step.distanceMeters, ' m')}</small>
                </li>
              ))}
            </ol>
          )}
          <p className="muted">
            {routeSource === 'KAKAO'
              ? demo
                ? '시연용 예시 경로입니다. 실제 카카오 경로를 조회하지 않습니다.'
                : '카카오 도보 경로에는 로보독의 위험도 기록이 반영되지 않습니다.'
              : '출발·도착지는 30m 안의 수집 지점에 연결됩니다. 연결된 기록이 없으면 경로를 찾을 수 없습니다.'}
          </p>
        </aside>
      </div>
    </>
  )
}
