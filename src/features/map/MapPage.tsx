import { useEffect, useMemo, useRef, useState } from 'react'
import type { Point, WalkingRoute } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, number, PageTitle } from '../../components/ui'
import ExpandableMap from './ExpandableMap'
import AddressSearch from './AddressSearch'
import { usePointAddress, type AddressPoint } from './usePointAddress'
import { demoPosition } from '../demo/session'
import { searchWalkingRoute } from './walkingRoute'
import { routeErrorMessage } from './routeErrors'
import { kakaoRouteUrl } from './kakaoRouteUrl'

const emptyOverlays = { segments: [], records: [] }
const ignoreBounds = () => {}

export default function MapPage() {
  const { api, status, reports, demo } = useRobot()
  const [start, setStart] = useState<AddressPoint | null>(null)
  const [end, setEnd] = useState<AddressPoint | null>(null)
  const startLabel = usePointAddress(start)
  const endLabel = usePointAddress(end)
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [focus, setFocus] = useState<Point | null>(null)
  const [selecting, setSelecting] = useState<'start' | 'end'>('start')
  const [route, setRoute] = useState<WalkingRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null)
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(true)
  const [locationRevision, setLocationRevision] = useState(0)
  const [locationMessage, setLocationMessage] = useState('현재 위치를 확인하고 있습니다.')
  const searchRevision = useRef(0)
  const routeRequest = useRef<AbortController | null>(null)
  useEffect(() => () => routeRequest.current?.abort(), [])
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
  const position = useMemo(
    () =>
      status.latitude == null || status.longitude == null
        ? null
        : { latitude: status.latitude, longitude: status.longitude },
    [status.latitude, status.longitude],
  )
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
      let result: WalkingRoute
      if (!demo) {
        result = await searchWalkingRoute(
          start,
          end,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        )
      } else {
        const collected = await api.searchPath(
          { latitude: start.latitude, longitude: start.longitude },
          { latitude: end.latitude, longitude: end.longitude },
          'SAFEST',
        )
        result = {
          provider: 'KAKAO',
          path: collected.path,
          distanceMeters: collected.distanceMeters,
          durationSeconds: Math.ceil(collected.distanceMeters / 1.2),
          steps: [],
        }
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
        description="출발지와 도착지를 선택해 로보독의 예상 이동 경로를 확인하세요."
      />
      <div className="map-layout">
        <section className="panel map-panel">
          <div className="map-legend">
            <span>● 보라색: 로보독 예상 이동 경로</span>
          </div>
          <ExpandableMap
            focus={focus}
            currentPosition={currentPosition}
            positionAccuracy={positionAccuracy}
            position={position}
            start={start}
            end={end}
            segments={emptyOverlays.segments}
            reports={reports}
            records={emptyOverlays.records}
            route={route}
            onSelect={selectPoint}
            onBounds={ignoreBounds}
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
          <p>출발지와 도착지를 선택하면 도보 경로를 표시합니다.</p>
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
              <div>
                <dt>{demo ? '예상 시간 (시연용)' : '예상 도보 시간'}</dt>
                <dd>약 {Math.ceil(route.durationSeconds / 60)}분</dd>
              </div>
            </dl>
          )}
          {route && route.steps.length > 0 && (
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
            {demo
              ? '시연용 예시 경로입니다.'
              : '도보 경로를 기준으로 한 예상 이동 경로입니다. 실시간 장애물은 반영되지 않습니다.'}
          </p>
        </aside>
      </div>
    </>
  )
}
