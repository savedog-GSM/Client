import type { LucideIcon } from 'lucide-react'

interface StatChipProps {
  icon: LucideIcon
  iconClassName: string
  label: string
  value: string
  tag?: { text: string; className: string }
}

export default function StatChip({ icon: Icon, iconClassName, label, value, tag }: StatChipProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${iconClassName}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {tag && <span className={`text-xs font-semibold ${tag.className}`}>{tag.text}</span>}
      </div>
      <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  )
}
