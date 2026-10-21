import { useState } from 'react'
import { Activity, Bell, FileText, History, Map, Settings, Smartphone } from 'lucide-react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import type { ConnectionSettings } from './api/types'
import ConnectionForm from './app/ConnectionForm'
import { RobotProvider, useRobot } from './app/RobotProvider'
import AlertBanner from './features/alerts/AlertBanner'
import AlertsPage from './features/alerts/AlertsPage'
import DashboardPage from './features/dashboard/DashboardPage'
import HistoryPage from './features/history/HistoryPage'
import LocationPage from './features/location/LocationPage'
import MapPage from './features/map/MapPage'
import ReportsPage from './features/reports/ReportsPage'

const navigation = [
  { path: '/', label: '대시보드', icon: Activity },
  { path: '/map', label: '안전 지도', icon: Map },
  { path: '/history', label: '이동 기록', icon: History },
  { path: '/reports', label: '위험 신고', icon: FileText },
  { path: '/alerts', label: '위험 알림', icon: Bell },
  { path: '/location', label: '위치 전송', icon: Smartphone },
]
function ControlPages() {
  const { stream, reports, retry } = useRobot()
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
          <img src="/savedog-logo.png" alt="" width={52} height={52} />
          <div>
            지켜멍<small>SaveDog</small>
          </div>
        </Link>
        <p className="nav-heading">관제 메뉴</p>
        <nav aria-label="주 메뉴">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink to={path} end={path === '/'} key={path}>
              <Icon size={19} />
              {label}
              {path === '/reports' && waiting > 0 && <span className="nav-count">{waiting}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            함께 걷는 길을
            <br />
            조금 더 안전하게.
          </p>
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
        <main id="main" className="main-content">
          <AlertBanner />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/routes" element={<Navigate to="/map" replace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/statistics" element={<Navigate to="/history" replace />} />
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
function Application() {
  const [settings, setSettings] = useState<ConnectionSettings>({
    apiUrl:
      import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    operatorToken: '',
    deviceToken: '',
  })
  const [showSettings, setShowSettings] = useState(false)
  const location = useLocation()
  const phone = location.pathname === '/location'
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <button className="settings-button" onClick={() => setShowSettings(true)}>
        <Settings size={17} />
        연결 설정
      </button>
      {phone ? (
        <>
          <header className="phone-header">
            <Link to="/" className="phone-brand">
              <img src="/savedog-logo.png" alt="" width={38} height={38} />
              <span>
                지켜멍 <small>관제 센터로 이동</small>
              </span>
            </Link>
          </header>
          <main id="main">
            <LocationPage settings={settings} />
          </main>
        </>
      ) : (
        <RobotProvider settings={settings}>
          <ControlPages />
        </RobotProvider>
      )}
      {showSettings && (
        <ConnectionForm
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <Application />
    </BrowserRouter>
  )
}
