import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

interface MainLayoutProps {
  alertCount: number
}

export default function MainLayout({ alertCount }: MainLayoutProps) {
  return (
    <div className="h-screen w-full px-0 py-0 sm:px-4 sm:py-6 md:px-8 md:py-10">
      <div className="mx-auto flex h-full w-full max-w-[1500px] overflow-hidden rounded-none border-line bg-surface sm:rounded-2xl sm:border sm:shadow-[0_1px_3px_rgba(16,21,31,0.06)]">
        <Sidebar alertCount={alertCount} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
