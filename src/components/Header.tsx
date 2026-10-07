import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="h-16 border-b border-line bg-surface">
      <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <p className="text-[17px] font-semibold tracking-tight text-ink">지켜멍</p>
        </Link>

        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="hidden sm:inline">실시간 연결됨</span>
        </span>
      </div>
    </header>
  )
}
