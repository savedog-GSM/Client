import { LayoutGrid, Map, BarChart3, Bell } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  alertCount: number
}

const menus = [
  { name: '대시보드', path: '/', icon: LayoutGrid },
  { name: '경로', path: '/routes', icon: Map },
  { name: '통계', path: '/statistics', icon: BarChart3 },
  { name: '알림', path: '/alerts', icon: Bell },
]

export default function Sidebar({ alertCount }: SidebarProps) {
  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-line md:w-56">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-4 md:px-6">
        <p className="hidden text-[17px] font-semibold tracking-tight text-ink md:block">지켜멍</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {menus.map((menu) => {
          const Icon = menu.icon
          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={menu.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition md:justify-start ${
                  isActive ? 'bg-accent-soft text-accent-strong' : 'text-ink-muted hover:bg-muted-bg hover:text-ink'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span className="hidden md:block">{menu.name}</span>
              {menu.path === '/alerts' && alertCount > 0 && (
                <span className="ml-auto hidden rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white md:block">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-4 text-xs font-medium text-ink-muted md:justify-start">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="hidden md:block">실시간 연결됨</span>
      </div>
    </aside>
  )
}
