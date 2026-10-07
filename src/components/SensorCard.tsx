interface SensorCardProps {
  title: string
  value: string
  description: string
  state?: 'normal' | 'warning' | 'danger'
}

export default function SensorCard({ title, value, description, state = 'normal' }: SensorCardProps) {
  const stateText = state === 'danger' ? '위험' : state === 'warning' ? '주의' : '정상'
  const stateClass =
    state === 'danger'
      ? 'text-red-600 bg-red-50'
      : state === 'warning'
        ? 'text-amber-600 bg-amber-50'
        : 'text-emerald-600 bg-emerald-50'

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-muted">{title}</p>
        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${stateClass}`}>{stateText}</span>
      </div>
      <p className="mt-4 font-mono text-[26px] font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-faint">{description}</p>
    </div>
  )
}
