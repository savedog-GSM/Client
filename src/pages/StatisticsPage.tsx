import { useMemo } from 'react'
import { routes } from '../constants/routes'
import { getAlerts, getRouteRecords, getSensorData } from '../utils/storage'

export default function StatisticsPage() {
  const sensorData = getSensorData()
  const alerts = getAlerts()
  const records = getRouteRecords()
  const averageDistance = useMemo(() => sensorData.length ? Math.round(sensorData.reduce((sum, item) => sum + item.distance, 0) / sensorData.length) : 0, [sensorData])
  const averageRoll = useMemo(() => sensorData.length ? (sensorData.reduce((sum, item) => sum + Math.abs(item.roll), 0) / sensorData.length).toFixed(1) : '0.0', [sensorData])
  const dangerCount = alerts.filter((alert) => alert.level === 'danger').length
  const safestRoute = [...routes].sort((a, b) => a.averageRisk - b.averageRisk)[0]
  const mostUsedRoute = [...routes].sort((a, b) => b.executionCount - a.executionCount)[0]

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">이동 데이터 통계</h1>
        <p className="mt-2 text-sm text-ink-muted">수집된 센서와 경로 데이터를 기준으로 이동 안전성을 확인합니다.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="센서 데이터" value={`${sensorData.length}`} unit="건" />
        <Stat title="평균 전방 거리" value={`${averageDistance}`} unit="mm" />
        <Stat title="평균 기울기" value={`${averageRoll}`} unit="°" />
        <Stat title="위험 발생" value={`${dangerCount}`} unit="회" danger />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">경로별 위험도</h2>
          <p className="mt-1 text-xs text-ink-faint">낮을수록 안전한 경로입니다.</p>
          <div className="mt-6 space-y-5">
            {routes.map((route) => (
              <div key={route.id}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-medium text-ink-muted">{route.name}</span>
                  <span className="font-mono font-semibold text-ink">{route.averageRisk}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${route.averageRisk}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">경로 분석 결과</h2>
          <div className="mt-5 space-y-2.5">
            <Result title="가장 안전한 경로" value={safestRoute.name} description={`평균 위험도 ${safestRoute.averageRisk}%`} />
            <Result title="가장 많이 사용된 경로" value={mostUsedRoute.name} description={`${mostUsedRoute.executionCount}회 실행`} />
            <Result title="누적 경로 실행" value={`${records.length}회`} description="저장된 이동 기록" />
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ title, value, unit, danger = false }: { title: string; value: string; unit: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-xs font-medium text-ink-muted">{title}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${danger ? 'text-red-600' : 'text-ink'}`}>
        {value}<span className="ml-1 font-sans text-xs font-medium text-ink-faint">{unit}</span>
      </p>
    </div>
  )
}

function Result({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-lg bg-muted-bg p-4">
      <p className="text-[10px] font-medium text-ink-muted">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{description}</p>
    </div>
  )
}
