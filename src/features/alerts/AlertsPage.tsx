import { useRobot } from '../../app/RobotProvider'
import { Empty, PageTitle, RiskBadge, time } from '../../components/ui'
import { alertTitle } from './alertTitle'

export default function AlertsPage() {
  const { alerts } = useRobot()
  return (
    <>
      <PageTitle
        title="위험 알림"
        description="현재 접속 중 수신한 위험 알림을 최신순으로 확인합니다. 새로고침하면 내역이 초기화됩니다."
      />
      <section className="panel">
        {alerts.length ? (
          alerts.map((alert) => (
            <article
              className={`alert-row ${alert.telemetry.risk.level === 'DANGER' && !alert.robotStopped ? 'urgent-text' : ''}`}
              key={alert.telemetry.id}
            >
              <div className="section-heading">
                <RiskBadge risk={alert.telemetry.risk} />
                <time>{time(alert.telemetry.recordedAt)}</time>
              </div>
              <h2>{alertTitle(alert)}</h2>
              <p>{alert.message}</p>
              <small>
                {alert.telemetry.risk.level === 'CAUTION'
                  ? '주변 장애물과 이동 경로를 확인해주세요.'
                  : alert.robotStopped
                    ? '실제 정지 여부를 확인해주세요.'
                    : '로보독 연결과 주변 상황을 즉시 확인해주세요.'}
              </small>
            </article>
          ))
        ) : (
          <Empty>수신한 위험 알림이 없습니다. 접속 전 알림은 서버에 저장되지 않습니다.</Empty>
        )}
      </section>
    </>
  )
}
