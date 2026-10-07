import type { Alert } from '../types'

interface AlertRowProps {
  alert: Alert
}

export default function AlertRow({ alert }: AlertRowProps) {
  const dotClass = {
    safe: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[alert.level]

  const tagClass = {
    safe: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }[alert.level]

  const tagText = { safe: '정상', warning: '주의', danger: '위험' }[alert.level]

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{alert.title}</p>
        <p className="text-xs text-ink-faint">
          {new Date(alert.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${tagClass}`}>{tagText}</span>
    </div>
  )
}
