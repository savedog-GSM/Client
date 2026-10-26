import Link from '../../app/ModeLink'
import { useRobot } from '../../app/RobotProvider'
import { Empty, riskNames } from '../../components/ui'
import { clockTime } from './clockTime'

export default function RecentAlerts() {
  const { alerts, stream, streamError, lastTelemetryReceivedAt, now } = useRobot()
  return (
    <section className="dashboard-alerts panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>최근 알림</h2>
          <p>최근 발생한 알림 5건</p>
        </div>
        <Link to="/alerts">전체 보기 →</Link>
      </div>
      <p className="alerts-history-note" role="status">
        {stream === 'connected'
          ? lastTelemetryReceivedAt && now - lastTelemetryReceivedAt <= 5000
            ? '센서 수신 중 · 주의·위험 상태로 바뀌면 알림을 표시합니다.'
            : '실시간 연결됨 · 센서 수신 대기 중입니다. 중계 프로그램의 센서 전송을 확인해주세요.'
          : streamError ||
            (stream === 'connecting'
              ? '실시간 알림 서버에 연결하고 있습니다.'
              : '실시간 연결이 끊겼습니다. 서버 주소와 관제 토큰을 확인해주세요.')}
      </p>
      {alerts.length ? (
        <>
          <p className="alerts-history-note">
            수신한 알림 {alerts.length}건 · 현재 상태와 구분해 확인하세요
          </p>
          <div className="dashboard-alert-list">
            {alerts.slice(0, 5).map((alert) => (
              <Link to="/alerts" className="dashboard-alert" key={alert.telemetry.id}>
                <span className="alert-symbol">
                  <img src="/figma/warning.svg" alt="" />
                </span>
                <div>
                  <strong>{riskNames[alert.telemetry.risk.level]} 알림</strong>
                  <p>{alert.message}</p>
                  <div className="alert-meta">
                    <time dateTime={alert.telemetry.recordedAt}>
                      {clockTime(alert.telemetry.recordedAt)}
                    </time>
                    <span className={alert.telemetry.risk.level.toLowerCase()}>
                      {riskNames[alert.telemetry.risk.level]} 기록
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Empty>수신한 위험 알림이 없습니다.</Empty>
      )}
    </section>
  )
}
