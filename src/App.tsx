import { useState } from 'react'
import { Settings } from 'lucide-react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import type { ConnectionSettings } from './api/types'
import ConnectionForm from './app/ConnectionForm'
import { RobotProvider } from './app/RobotProvider'
import ControlLayout from './app/ControlLayout'
import PhoneLayout from './app/PhoneLayout'
import PresentationGuide from './features/presentation/PresentationGuide'

function Application() {
  const [settings, setSettings] = useState<ConnectionSettings>({
    apiUrl:
      import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    operatorToken: '',
    deviceToken: '',
  })
  const [showSettings, setShowSettings] = useState(false)
  const location = useLocation()
  const phone = location.pathname === '/location' || location.pathname === '/facilities'
  const query = new URLSearchParams(location.search)
  const demo = query.get('demo') === '1'
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <button
        className={`settings-button ${phone ? 'phone-settings' : ''}`}
        onClick={() => setShowSettings(true)}
      >
        <Settings size={17} />
        연결 설정
      </button>
      <RobotProvider
        key={`${demo}-${query.get('run') ?? ''}`}
        settings={settings}
        demo={demo}
        scenario={query.get('scenario') ?? ''}
        enabled={!phone}
      >
        {phone ? <PhoneLayout settings={settings} /> : <ControlLayout />}
      </RobotProvider>
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
      <PresentationGuide />
    </BrowserRouter>
  )
}
