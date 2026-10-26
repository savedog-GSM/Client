import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import SafetyMap from '../map/SafetyMap'
import type { FacilityOrigin, FacilityRoute } from './types'

const ignore = () => {}

export default function FacilityRouteResult({
  result,
  simulated,
}: {
  result: { origin: FacilityOrigin; data: FacilityRoute }
  simulated: boolean
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [mapOpen, setMapOpen] = useState(false)
  useEffect(() => {
    heading.current?.focus()
  }, [result])
  return (
    <section className="facility-result" aria-labelledby="facility-result-title">
      <span className="facility-result-label">
        <MapPin size={18} aria-hidden="true" />
        {simulated ? '시연용 안내' : '가까운 편의시설'}
      </span>
      <h2 id="facility-result-title" tabIndex={-1} ref={heading}>
        {result.data.facility.name}
      </h2>
      <p className="facility-address">{result.data.facility.address || '주소 정보가 없습니다.'}</p>
      <dl className="facility-distance">
        <div>
          <dt>걸어가는 거리</dt>
          <dd>약 {Math.round(result.data.route.distanceMeters).toLocaleString('ko-KR')}m</dd>
        </div>
        <div>
          <dt>예상 시간</dt>
          <dd>
            {result.data.route.durationSeconds === 0
              ? '도착 위치'
              : `약 ${Math.ceil(result.data.route.durationSeconds / 60)}분`}
          </dd>
        </div>
      </dl>
      {simulated && (
        <p className="facility-demo-note">실제 시설이나 보행 경로가 아닌 시연용 예시입니다.</p>
      )}
      <h3>이동 경로</h3>
      <ol className="facility-steps">
        {result.data.route.steps.map((step, index) => (
          <li key={index}>
            <span>{step.instruction}</span>
            <small>{Math.round(step.distanceMeters)}m</small>
          </li>
        ))}
      </ol>
      <details className="facility-map" onToggle={(event) => setMapOpen(event.currentTarget.open)}>
        <summary>지도로 경로 보기</summary>
        {mapOpen && (
          <SafetyMap
            currentPosition={result.origin}
            positionAccuracy={result.origin.accuracy}
            position={null}
            start={result.origin}
            end={result.data.facility}
            route={result.data.route}
            segments={[]}
            reports={[]}
            records={[]}
            onSelect={ignore}
            onBounds={ignore}
          />
        )}
      </details>
      <p className="facility-route-note">
        이 화면은 경로 조회입니다. 이동 중 위치에 따른 실시간 회전·도착 안내는 제공하지 않습니다.
      </p>
    </section>
  )
}
