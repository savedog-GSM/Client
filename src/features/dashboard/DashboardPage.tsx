import { Activity, Gauge, RotateCw, Navigation } from 'lucide-react'
import { useRobot } from '../../app/RobotProvider'
import {
  Empty,
  ErrorNotice,
  isFresh,
  number,
  PageTitle,
  RiskBadge,
  time,
} from '../../components/ui'
import RobotControls from './RobotControls'
import CameraPanel from './CameraPanel'

export default function DashboardPage() {
  const { status, statusError, retry, history, alerts, now, stream } = useRobot()
  const sensorFresh = stream === 'connected' && isFresh(status.lastSeenAt, now, 3)
  const gpsFresh =
    stream === 'connected' &&
    status.latitude !== null &&
    status.longitude !== null &&
    isFresh(status.lastLocationAt, now, 5)
  const cards = [
    {
      title: '전방 거리',
      value: number(sensorFresh ? status.sensor?.distance : null, ' cm'),
      icon: Gauge,
    },
    {
      title: '좌우 기울기',
      value: number(sensorFresh ? status.sensor?.roll : null, '°'),
      icon: RotateCw,
    },
    {
      title: '앞뒤 기울기',
      value: number(sensorFresh ? status.sensor?.pitch : null, '°'),
      icon: Activity,
    },
    { title: '이동 속도', value: number(gpsFresh ? status.speed : null, ' m/s'), icon: Navigation },
  ]
  return (
    <>
      <PageTitle
        title="대시보드"
        description="로보독의 현재 상태와 주변 안전 정보를 확인하세요."
        action={<RiskBadge risk={sensorFresh ? status.risk : null} />}
      />
      <ErrorNotice message={statusError} retry={retry} />
      <div className="metric-grid">
        {cards.map(({ title, value, icon: Icon }) => (
          <section className="metric" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <p>실시간 센서 데이터</p>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>실시간 위험도</h2>
                <p>서버가 판단한 최근 60개 기록 · 1–5점</p>
              </div>
              <RiskBadge risk={sensorFresh ? status.risk : null} />
            </div>
            {history.length ? (
              <div className="chart">
                <svg viewBox="0 0 720 220" role="img" aria-label="실시간 위험도 추이">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <g key={value}>
                      <line
                        x1="30"
                        x2="705"
                        y1={200 - (value - 1) * 45}
                        y2={200 - (value - 1) * 45}
                        stroke="#e3e9e7"
                      />
                      <text x="8" y={205 - (value - 1) * 45} fontSize="12" fill="#667771">
                        {value}
                      </text>
                    </g>
                  ))}
                  <circle
                    cx={history.length === 1 ? 30 : 705}
                    cy={200 - (history[history.length - 1].risk.score - 1) * 45}
                    r="4"
                    fill="#13765b"
                  />
                  <polyline
                    points={history
                      .map(
                        (item, i) =>
                          `${30 + (i / Math.max(history.length - 1, 1)) * 675},${200 - (item.risk.score - 1) * 45}`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke="#13765b"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            ) : (
              <Empty>센서 데이터를 기다리고 있습니다.</Empty>
            )}
            <p className="muted">
              {sensorFresh
                ? (status.risk?.reason ?? '서버에서 안전 상태로 판단했습니다.')
                : '센서가 3초 이상 갱신되지 않았거나 실시간 연결이 끊겼습니다.'}
            </p>
          </section>
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
            </dl>
          </section>
          <CameraPanel />
        </div>
        <div className="stack">
          <RobotControls />
          <section className="panel">
            <div className="section-heading">
              <h2>최근 위험 알림</h2>
              <span className="count">{alerts.length}</span>
            </div>
            {alerts.length ? (
              alerts.slice(0, 4).map((alert) => (
                <div className="alert-row" key={alert.telemetry.id}>
                  <RiskBadge risk={alert.telemetry.risk} />
                  <p>{alert.message}</p>
                  <small>{time(alert.telemetry.recordedAt)}</small>
                </div>
              ))
            ) : (
              <Empty>수신한 위험 알림이 없습니다.</Empty>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
