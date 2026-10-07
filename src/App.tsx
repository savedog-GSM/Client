import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AlertsPage from './pages/AlertsPage'
import DashboardPage from './pages/DashboardPage'
import RoutesPage from './pages/RoutesPage'
import StatisticsPage from './pages/StatisticsPage'
import { getAlerts } from './utils/storage'

export default function App() {
  const [alertCount, setAlertCount] = useState(getAlerts().length)

  useEffect(() => {
    const interval = setInterval(() => setAlertCount(getAlerts().length), 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout alertCount={alertCount} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}