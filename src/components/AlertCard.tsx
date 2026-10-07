import type { Alert } from '../types'

interface AlertCardProps {
  alert: Alert
}

export default function AlertCard({ alert }: AlertCardProps) {
  const styles = {
    safe: 'border-emerald-100 bg-emerald-50/60',
    warning: 'border-amber-100 bg-amber-50/60',
    danger: 'border-red-100 bg-red-50/60',
  }

  const badge = {
    safe: '정상',
    warning: '주의',
    danger: '위험',
  }

  const badgeStyles = {
    safe: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`h-full min-h-[88px] rounded-xl border p-4 ${styles[alert.level]}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${badgeStyles[alert.level]}`}>
          {badge[alert.level]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{alert.title}</p>
            <time className="font-mono text-[10px] font-medium text-ink-faint">
              {new Date(alert.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{alert.message}</p>
        </div>
      </div>
    </div>
  )
}
