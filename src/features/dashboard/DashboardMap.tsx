import { useMemo, useState } from 'react'
import Link from '../../app/ModeLink'
import { useRobot } from '../../app/RobotProvider'
import { isFresh, number } from '../../components/ui'
import { clockTime } from './clockTime'
import type { Segment } from '../../api/types'
import SafetyMap from '../map/SafetyMap'

const ignore = () => {}

export default function DashboardMap() {
  const { status, history, reports, now, stream } = useRobot()
  const [showPath, setShowPath] = useState(true)
  const position = useMemo(
    () =>
      status.latitude == null || status.longitude == null
        ? null
        : { latitude: status.latitude, longitude: status.longitude },
    [status.latitude, status.longitude],
  )
  const segments = useMemo(() => {
    const result: Segment[] = []
    history.forEach((record, index) => {
      const previous = history[index - 1]
      if (
        !previous ||
        previous.latitude == null ||
        previous.longitude == null ||
        record.latitude == null ||
        record.longitude == null
      )
        return
      const gap = new Date(record.recordedAt).getTime() - new Date(previous.recordedAt).getTime()
      if (gap < 0 || gap > 5000) return
      result.push({
        level: record.risk.level,
        path: [
          { latitude: previous.latitude, longitude: previous.longitude },
          { latitude: record.latitude, longitude: record.longitude },
        ],
      })
    })
    return result
  }, [history])
  const gpsFresh = stream === 'connected' && position && isFresh(status.lastLocationAt, now, 5)
  return (
    <section className="dashboard-map panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>현재 위치와 이동 경로</h2>
          <p>로보독의 마지막 위치와 수신한 이동 기록을 확인해요.</p>
        </div>
        <span className={`movement-state ${gpsFresh ? 'active' : ''}`}>
          ● {gpsFresh ? '위치 수신 중' : '위치 수신 대기'}
        </span>
      </div>
      <div className="dashboard-map-view">
        <SafetyMap
          currentPosition={null}
          position={position}
          start={null}
          end={null}
          segments={showPath ? segments : []}
          reports={reports}
          records={[]}
          route={null}
          onSelect={ignore}
          onBounds={ignore}
        />
        <span className="dashboard-map-caption">
          {showPath ? '실시간 이동 기록' : '로보독 마지막 위치'}
        </span>
      </div>
      <div className="dashboard-map-footer">
        <dl>
          <div>
            <dt>최근 이동 구간</dt>
            <dd>{segments.length}개</dd>
          </div>
          <div>
            <dt>이동 속도</dt>
            <dd>{number(gpsFresh ? status.speed : null, ' m/s')}</dd>
          </div>
          <div>
            <dt>GPS 수신</dt>
            <dd>{clockTime(status.lastLocationAt)}</dd>
          </div>
        </dl>
        <div className="dashboard-map-actions">
          <label className="path-toggle">
            <input
              type="checkbox"
              checked={showPath}
              onChange={(event) => setShowPath(event.target.checked)}
            />
            <span className="path-toggle-box">
              {showPath && <img src="/figma/checkbox.svg" alt="" />}
            </span>
            경로 표시
          </label>
          <Link to="/map">경로 보기 →</Link>
        </div>
      </div>
      {!gpsFresh && (
        <p className="dashboard-map-note">
          {position
            ? 'GPS가 갱신되지 않아 마지막 수신 위치를 표시합니다.'
            : '로보독 GPS가 수신되면 지도에 위치를 표시합니다.'}
        </p>
      )}
    </section>
  )
}
