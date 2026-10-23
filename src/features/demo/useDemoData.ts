import { useEffect, useState, useSyncExternalStore } from 'react'
import { createDemoSession } from './session'
import type { RiskLevel } from '../../api/types'

export function useDemoData(scenario: string) {
  const [session] = useState(createDemoSession)
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => {
    const timer = window.setInterval(session.tick, 1000)
    return () => window.clearInterval(timer)
  }, [session])
  useEffect(() => {
    const level: RiskLevel = scenario === 'CAUTION' || scenario === 'DANGER' ? scenario : 'SAFE'
    session.setRisk(level)
  }, [session, scenario])
  return {
    ...snapshot,
    api: session.api,
    demo: true,
    stream: 'connected' as const,
    statusError: '',
    reportsError: '',
    reportsLoading: false,
    updateReport: session.updateReport,
    retry: session.tick,
  }
}
