import { createContext, useContext, type ReactNode } from 'react'
import type { ConnectionSettings } from '../api/types'
import { useDemoData } from '../features/demo/useDemoData'
import { useLiveRobotData } from './useLiveRobotData'

export { initialStatus } from './useLiveRobotData'

const RobotContext = createContext<ReturnType<typeof useLiveRobotData> | null>(null)
export function RobotProvider({
  settings,
  children,
  demo = false,
  scenario = '',
  enabled = true,
}: {
  settings: ConnectionSettings
  children: ReactNode
  demo?: boolean
  scenario?: string
  enabled?: boolean
}) {
  return demo ? (
    <DemoProvider scenario={scenario}>{children}</DemoProvider>
  ) : (
    <LiveProvider settings={settings} enabled={enabled}>
      {children}
    </LiveProvider>
  )
}
function DemoProvider({ scenario, children }: { scenario: string; children: ReactNode }) {
  const value = useDemoData(scenario)
  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>
}
function LiveProvider({
  settings,
  enabled,
  children,
}: {
  settings: ConnectionSettings
  enabled: boolean
  children: ReactNode
}) {
  const value = useLiveRobotData(settings, enabled)
  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>
}
export function useRobot() {
  const value = useContext(RobotContext)
  if (!value) throw new Error('RobotProvider가 필요합니다.')
  return value
}
