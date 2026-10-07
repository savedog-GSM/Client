import { useMemo, useState } from 'react'
import RouteCard from '../components/RouteCard'
import { routes } from '../constants/routes'
import { calculateRiskScore } from '../utils/risk'
import { saveRouteRecord } from '../utils/storage'

export default function RoutesPage() {
  const [executing, setExecuting] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string | null>(null)

  const optimalRoute = useMemo(() => [...routes].sort((a, b) => a.averageRisk + a.distance * 0.5 - (b.averageRisk + b.distance * 0.5))[0], [])

  const executeRoute = (routeId: string) => {
    const route = routes.find((item) => item.id === routeId)
    if (!route) return
    setExecuting(routeId)
    setCompleted(null)
    window.setTimeout(() => {
      saveRouteRecord({ id: crypto.randomUUID(), routeId: route.id, timestamp: Date.now(), distance: route.distance, riskScore: calculateRiskScore({ distance: 400, roll: route.tiltScore, pitch: route.tiltScore, timestamp: Date.now() }), obstacleCount: route.obstacleCount, duration: route.distance * 3 })
      setExecuting(null)
      setCompleted(routeId)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">안전한 이동 경로</h1>
        <p className="mt-2 text-sm text-ink-muted">거리, 장애물, 기울기 데이터를 비교해 로보독에게 적합한 경로를 선택하세요.</p>
      </section>

      {completed && <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">경로 실행이 완료되었습니다. 이동 기록에 새로운 데이터가 추가되었습니다.</div>}

      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-medium text-ink-muted">추천 기준</p><p className="mt-1 text-sm font-semibold text-ink">위험도와 이동 거리를 함께 고려합니다.</p></div>
          <p className="text-xs text-ink-faint">현재 {routes.length}개 경로 비교 중</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {routes.map((route) => (
          <div key={route.id} className="relative">
            {executing === route.id && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm"><div className="rounded-lg bg-accent px-5 py-3 text-xs font-semibold text-white">경로를 실행하고 있습니다...</div></div>}
            <RouteCard route={route} optimal={route.id === optimalRoute.id} onExecute={() => executeRoute(route.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}
