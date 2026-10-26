import { useLocation } from 'react-router-dom'
import type { ConnectionSettings } from '../api/types'
import { useRobot } from './RobotProvider'
import Link from './ModeLink'
import DemoBanner from '../features/demo/DemoBanner'
import FacilitiesPage from '../features/facilities/FacilitiesPage'
import LocationPage from '../features/location/LocationPage'

export default function PhoneLayout({ settings }: { settings: ConnectionSettings }) {
  const location = useLocation()
  const { demo, api } = useRobot()
  return (
    <>
      <header className="phone-header">
        <Link to="/" className="phone-brand">
          <img src="/savedog-icon.png" alt="" width={38} height={38} />
          <span>
            지켜멍 <small>관제 센터로 이동</small>
          </span>
        </Link>
      </header>
      <nav className="phone-pages" aria-label="스마트폰 메뉴">
        <Link
          to="/facilities"
          aria-current={location.pathname === '/facilities' ? 'page' : undefined}
        >
          편의시설
        </Link>
        <Link to="/location" aria-current={location.pathname === '/location' ? 'page' : undefined}>
          위치 전송
        </Link>
      </nav>
      {demo && <DemoBanner />}
      <main id="main">
        {location.pathname === '/facilities' ? (
          <FacilitiesPage settings={settings} simulated={demo} />
        ) : (
          <LocationPage settings={settings} simulated={demo} apiOverride={demo ? api : undefined} />
        )}
      </main>
    </>
  )
}
