import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createApi, errorMessage } from '../api/client'
import { connectStream, type StreamState } from '../api/realtime'
import type { ConnectionSettings, DangerAlert, Report, RobotStatus, Telemetry } from '../api/types'

export const initialStatus: RobotStatus = {
  connected: false,
  lastSeenAt: null,
  lastLocationAt: null,
  latitude: null,
  longitude: null,
  speed: null,
  sensor: null,
  risk: null,
}

function useRobotData(settings: ConnectionSettings) {
  const api = useMemo(() => createApi(settings), [settings])
  const [status, setStatus] = useState(initialStatus)
  const [stream, setStream] = useState<StreamState>('connecting')
  const [statusError, setStatusError] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [reportsError, setReportsError] = useState('')
  const [reportsLoading, setReportsLoading] = useState(true)
  const [alerts, setAlerts] = useState<DangerAlert[]>([])
  const [history, setHistory] = useState<Telemetry[]>([])
  const [refresh, setRefresh] = useState(0)
  const [now, setNow] = useState(Date.now())
  const updateReport = useCallback((report: Report) => {
    setReports((current) =>
      [report, ...current.filter((item) => item.id !== report.id)]
        .sort((a, b) => b.id - a.id)
        .slice(0, 1000),
    )
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let telemetryRevision = 0
    let connectionRevision = 0
    const changedReports = new Set<number>()
    let requestNumber = 0
    setStatus(initialStatus)
    setHistory([])
    setAlerts([])
    setReports([])
    const sync = async () => {
      const currentRequest = ++requestNumber
      const currentTelemetry = telemetryRevision
      const currentConnection = connectionRevision
      changedReports.clear()
      setReportsLoading(true)
      const [statusResult, reportsResult] = await Promise.allSettled([
        api.status(controller.signal),
        api.reports(controller.signal),
      ])
      if (!active || currentRequest !== requestNumber) return
      if (statusResult.status === 'fulfilled') {
        setStatus((current) => ({
          ...statusResult.value,
          ...(currentConnection !== connectionRevision ? { connected: current.connected } : {}),
          ...(currentTelemetry !== telemetryRevision
            ? {
                sensor: current.sensor,
                risk: current.risk,
                latitude: current.latitude,
                longitude: current.longitude,
                speed: current.speed,
                lastSeenAt: current.lastSeenAt,
                lastLocationAt: current.lastLocationAt,
              }
            : {}),
        }))
        setStatusError('')
      } else setStatusError(errorMessage(statusResult.reason))
      if (reportsResult.status === 'fulfilled') {
        setReports((current) => {
          const byId = new Map(reportsResult.value.map((report) => [report.id, report]))
          current
            .filter((report) => changedReports.has(report.id))
            .forEach((report) => byId.set(report.id, report))
          return [...byId.values()].sort((a, b) => b.id - a.id).slice(0, 1000)
        })
        setReportsError('')
      } else setReportsError(errorMessage(reportsResult.reason))
      setReportsLoading(false)
    }
    void sync()
    const stop = connectStream(settings, {
      state: (value) => {
        if (active) setStream(value)
      },
      ready: () => {
        if (active) void sync()
      },
      telemetry: (value) => {
        if (!active) return
        telemetryRevision++
        setStatus((current) => ({
          ...current,
          ...value,
          lastSeenAt: value.recordedAt,
          lastLocationAt:
            value.latitude !== null && value.longitude !== null
              ? value.recordedAt
              : current.lastLocationAt,
        }))
        setHistory((current) =>
          [...current.filter((item) => item.id !== value.id), value].slice(-60),
        )
      },
      status: (value) => {
        if (!active) return
        connectionRevision++
        setStatus((current) => ({ ...current, connected: value.connected }))
      },
      report: (value) => {
        if (active) {
          changedReports.add(value.id)
          updateReport(value)
        }
      },
      alert: (value) => {
        if (!active) return
        setAlerts((current) =>
          current.some((item) => item.telemetry.id === value.telemetry.id)
            ? current
            : [value, ...current].slice(0, 100),
        )
      },
    })
    return () => {
      active = false
      controller.abort()
      stop()
    }
  }, [api, settings, refresh, updateReport])

  return {
    api,
    status,
    stream,
    statusError,
    reports,
    reportsError,
    reportsLoading,
    alerts,
    history,
    now,
    updateReport,
    retry: () => setRefresh((value) => value + 1),
  }
}

const RobotContext = createContext<ReturnType<typeof useRobotData> | null>(null)
export function RobotProvider({
  settings,
  children,
}: {
  settings: ConnectionSettings
  children: ReactNode
}) {
  const value = useRobotData(settings)
  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>
}
export function useRobot() {
  const value = useContext(RobotContext)
  if (!value) throw new Error('RobotProvider가 필요합니다.')
  return value
}
