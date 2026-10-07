import type { Route } from '../types'

interface RouteCardProps {
  route: Route
  optimal?: boolean
  onExecute: () => void
}

export default function RouteCard({ route, optimal, onExecute }: RouteCardProps) {
  return (
    <article
      className={`rounded-xl border bg-surface p-5 ${
        optimal ? 'border-accent ring-1 ring-accent/15' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {optimal && (
            <span className="mb-2 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
              추천 경로
            </span>
          )}
          <h3 className="text-lg font-semibold tracking-tight text-ink">{route.name}</h3>
          <p className="mt-1 text-xs text-ink-faint">총 이동 거리 {route.distance}m</p>
        </div>
        <span className="shrink-0 rounded-md bg-muted-bg px-2.5 py-1.5 text-[10px] font-semibold text-ink-muted">
          {route.executionCount}회 이용
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric label="위험도" value={`${route.averageRisk}%`} />
        <Metric label="장애물" value={`${route.obstacleCount}회`} />
        <Metric label="기울기" value={`${route.tiltScore}°`} />
      </div>

      <button
        onClick={onExecute}
        className="mt-5 w-full rounded-lg bg-accent py-3 text-xs font-semibold text-white transition hover:bg-accent-strong active:scale-[0.99]"
      >
        이 경로 실행
      </button>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted-bg p-3">
      <p className="text-[10px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}
