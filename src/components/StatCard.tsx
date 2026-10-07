interface StatCardProps {
  title: string
  value: string
  description: string
}

export default function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-[12px] font-medium text-ink-muted">{title}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-faint">{description}</p>
    </div>
  )
}
