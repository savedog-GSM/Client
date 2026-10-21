import { Link } from 'react-router-dom'
import { useRobot } from '../../app/RobotProvider'
import { Empty, riskNames, time } from '../../components/ui'

export default function RecentAlerts() {
  const { alerts } = useRobot()
  return (
    <section className="dashboard-alerts panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>최근 알림</h2>
          <p>최근 발생한 알림 5건</p>
        </div>
        <Link to="/alerts">전체 보기 →</Link>
      </div>
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
                    <time>{time(alert.telemetry.recordedAt)}</time>
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
