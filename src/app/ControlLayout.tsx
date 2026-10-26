import { Activity, Bell, FileText, History, Map, Smartphone } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useRobot } from './RobotProvider'
import Link from './ModeLink'
import AlertToast from '../features/alerts/AlertToast'
import AlertsPage from '../features/alerts/AlertsPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import HistoryPage from '../features/history/HistoryPage'
import MapPage from '../features/map/MapPage'
import ReportsPage from '../features/reports/ReportsPage'
import DemoBanner from '../features/demo/DemoBanner'

const navigation = [
  { path: '/', label: '대시보드', icon: Activity, image: '/figma/dashboard.svg' },
  { path: '/map', label: '경로', icon: Map, image: '/figma/map.svg' },
  { path: '/history', label: '통계', icon: History, image: '/figma/history.svg' },
  { path: '/reports', label: '위험 신고', icon: FileText },
  { path: '/alerts', label: '알림', icon: Bell, image: '/figma/alerts.svg' },
  { path: '/facilities', label: '편의시설', icon: Map },
  { path: '/location', label: '위치 전송', icon: Smartphone },
]
export default function ControlLayout() {
  const { stream, reports, retry, alerts, demo } = useRobot()
  const { search } = useLocation()
  const streamNames = {
    connecting: '연결 중',
    connected: '실시간 연결됨',
    disconnected: '연결 끊김 · 재연결 중',
    error: '연결 오류 · 설정 확인',
  }
  const waiting = reports.filter(
    (report) => report.status === 'PENDING' || report.status === 'FAILED',
  ).length
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="지켜멍 대시보드">
          <img src="/savedog-icon.png" alt="" width={52} height={52} />
          <div>지켜멍</div>
        </Link>
        <nav aria-label="주 메뉴">
          {navigation.map(({ path, label, icon: Icon, image }) => (
            <NavLink to={{ pathname: path, search }} end={path === '/'} key={path}>
              {image ? <img src={image} alt="" /> : <Icon size={21} />}
              {label}
              {path === '/reports' && waiting > 0 && <span className="nav-count">{waiting}</span>}
              {path === '/alerts' && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-connection">
            <span className={`stream-dot ${stream}`} />
            <span>{demo ? '시연 데이터 재생 중' : streamNames[stream]}</span>
          </div>
          <p>지켜멍 로봇 · DEVICE 01</p>
          {stream !== 'connected' && <button onClick={retry}>다시 연결</button>}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>지켜멍 관제 센터</span>
          <div>
            <span className={`stream-dot ${stream}`} />
            {streamNames[stream]}
            {stream !== 'connected' && <button onClick={retry}>다시 연결</button>}
          </div>
        </header>
        {demo && <DemoBanner />}
        <main id="main" className="main-content">
          <AlertToast />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route
              path="/routes"
              element={<Navigate to={{ pathname: '/map', search }} replace />}
            />
            <Route path="/history" element={<HistoryPage />} />
            <Route
              path="/statistics"
              element={<Navigate to={{ pathname: '/history', search }} replace />}
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route
              path="*"
              element={
                <div className="panel">
                  <h1>페이지를 찾을 수 없습니다.</h1>
                  <Link to="/">대시보드로 이동</Link>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}
