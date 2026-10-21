import { Link } from 'react-router-dom'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, isFresh, number, PageTitle, time } from '../../components/ui'
import RobotControls from './RobotControls'
import CameraPanel from './CameraPanel'
import DashboardMap from './DashboardMap'
import RecentAlerts from './RecentAlerts'
import RiskTrend from './RiskTrend'
import './dashboard.css'
import { clockTime } from './clockTime'

export default function DashboardPage() {
  const { status, statusError, retry, now, stream } = useRobot()
  const sensorFresh = stream === 'connected' && isFresh(status.lastSeenAt, now, 3)
  const gpsFresh =
    stream === 'connected' &&
    status.latitude !== null &&
    status.longitude !== null &&
    isFresh(status.lastLocationAt, now, 5)
  const risk = sensorFresh ? status.risk : null
  const summary = !risk
    ? '센서 수신 대기'
    : risk.level === 'DANGER'
      ? '주변 확인이 필요해요'
      : risk.level === 'CAUTION'
        ? '주의가 필요한 상태'
        : '안전한 상태예요'
  const cards = [
    {
      title: '전방 장애물 거리',
      tag: 'ToF',
      value: sensorFresh ? status.sensor?.distance : null,
      unit: 'cm',
      description: '전방 거리 측정값',
    },
    {
      title: '좌우 기울기',
      tag: 'Roll',
      value: sensorFresh ? status.sensor?.roll : null,
      unit: '°',
      description: '좌우 자세 측정값',
    },
    {
      title: '앞뒤 기울기',
      tag: 'Pitch',
      value: sensorFresh ? status.sensor?.pitch : null,
      unit: '°',
      description: '앞뒤 자세 측정값',
    },
  ]
  return (
    <div className="dashboard-page">
      <PageTitle
        title="실시간 대시보드"
        description="지켜멍과 함께하는 이동, 한눈에 확인하세요."
        action={
          <div className="dashboard-refresh">
            <span>최근 업데이트 {clockTime(status.lastSeenAt)}</span>
            <button onClick={retry}>
              <img src="/figma/refresh.svg" alt="" />
              새로고침
            </button>
          </div>
        }
      />
      <ErrorNotice message={statusError} retry={retry} />
      <div className="dashboard-metrics">
        <section
          className={`dashboard-metric summary-metric ${risk?.level.toLowerCase() ?? 'unknown'}`}
        >
          <div className="metric-title">
            <span className="summary-dot" />
            종합 상태
          </div>
          <strong>{summary}</strong>
          <p>
            {risk?.reason ??
              (risk ? '현재 센서 기준 · 특이사항 없음' : '센서가 연결되면 상태를 표시합니다.')}
          </p>
          <img className="summary-shield" src="/figma/shield.svg" alt="" />
        </section>
        {cards.map((card) => (
          <section className="dashboard-metric" key={card.tag}>
            <div className="metric-title">
              {card.title}
              <span className="sensor-tag">{card.tag}</span>
            </div>
            <div className="metric-value">
              <strong>{card.value == null ? '값 없음' : number(card.value)}</strong>
              {card.value != null && <small>{card.unit}</small>}
            </div>
            <p>{card.description}</p>
          </section>
        ))}
      </div>
      <div className="dashboard-overview">
        <DashboardMap />
        <RecentAlerts />
      </div>
      <RiskTrend currentRisk={risk} />
      <details className="dashboard-tools">
        <summary>로보독 제어 및 연결 정보</summary>
        <div className="dashboard-tools-grid">
          <RobotControls />
          <section className="panel">
            <h2>연결 및 위치</h2>
            <dl className="details">
              <div>
                <dt>명령 채널</dt>
                <dd>
                  {stream !== 'connected'
                    ? '상태 확인 불가'
                    : status.connected
                      ? '연결됨'
                      : '연결 끊김'}
                </dd>
              </div>
              <div>
                <dt>센서 수신</dt>
                <dd>{time(status.lastSeenAt)}</dd>
              </div>
              <div>
                <dt>GPS 수신</dt>
                <dd>
                  {gpsFresh ? '정상' : '끊김 또는 수신 대기'} · {time(status.lastLocationAt)}
                </dd>
              </div>
              <div>
                <dt>마지막 좌표</dt>
                <dd>
                  {status.latitude == null || status.longitude == null
                    ? '위치 없음'
                    : `${status.latitude.toFixed(6)}, ${status.longitude.toFixed(6)}`}
                </dd>
              </div>
              <div>
                <dt>이동 속도</dt>
                <dd>{number(gpsFresh ? status.speed : null, ' m/s')}</dd>
              </div>
            </dl>
          </section>
          <CameraPanel />
        </div>
      </details>
      <footer className="dashboard-footer">
        지켜멍 · 함께 걷는 안심 <Link to="/map">경로 확인하기 →</Link>
      </footer>
    </div>
  )
}
