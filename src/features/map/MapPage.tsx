import { useCallback, useMemo, useState } from 'react'
import type { Point } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, PageTitle } from '../../components/ui'
import ExpandableMap from './ExpandableMap'
import AddressSearch from './AddressSearch'
import { usePointAddress, type AddressPoint } from './usePointAddress'

import { useCurrentPosition } from './useCurrentPosition'
import { useWalkingRoute } from './useWalkingRoute'

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
  const { route, loading, error, search, invalidateRoute } = useWalkingRoute(
    api,
    demo,
  )
  const focusCurrentPosition = useCallback((point: Point) => {
    setFocus((previous) => previous ?? point)
  }, [])
  const {
    currentPosition,
    positionAccuracy,
    locating,
    locationMessage,
    refreshPosition,
  } = useCurrentPosition(demo, focusCurrentPosition)
  const position = useMemo(
    () =>
      status.latitude == null || status.longitude == null
        ? null
        : { latitude: status.latitude, longitude: status.longitude },
    [status.latitude, status.longitude],
  )
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
              위치 오차 범위: 약{' '}
              {Math.ceil(positionAccuracy).toLocaleString('ko-KR')}m.
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
              refreshPosition()
            }}
          >
            {locating ? '위치 확인 중…' : '현재 위치 다시 확인'}
          </button>
          <p className="muted">
            지도를 눌러 {selecting === 'start' ? '출발지' : '도착지'}를
            선택하세요. 로보독 표시는 마지막 수신 위치입니다.
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
            <button
              aria-pressed={selecting === 'start'}
              onClick={() => setSelecting('start')}
            >
              <strong>출발지 선택</strong>
              <small>{start ? startLabel : '지도를 눌러 선택'}</small>
            </button>
            <button
              aria-pressed={selecting === 'end'}
              onClick={() => setSelecting('end')}
            >
              <strong>도착지 선택</strong>
              <small>{end ? endLabel : '지도를 눌러 선택'}</small>
            </button>
          </div>
          <button
            className="primary full-width"
            disabled={!start || !end || loading}
            onClick={() => void search(start, end)}
          >
            {loading ? '경로 탐색 중…' : '경로 찾기'}
          </button>
          <ErrorNotice message={error} />
          <p className="muted">
            {demo
              ? '시연용 예시 경로입니다.'
              : '도보 경로를 기준으로 한 예상 이동 경로입니다.'}
          </p>
        </aside>
      </div>
    </>
  )
}
