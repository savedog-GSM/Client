import { useCallback, useEffect, useMemo, useState } from 'react'
import { createApi, errorMessage } from '../api/client'
import { connectStream, type StreamState } from '../api/realtime'
import type {
  ConnectionSettings,
  DangerAlert,
  Report,
  RobotStatus,
  Telemetry,
  RiskLevel,
} from '../api/types'

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

export function useLiveRobotData(settings: ConnectionSettings, enabled = true) {
  const api = useMemo(() => createApi(settings), [settings])
  const [status, setStatus] = useState(initialStatus)
  const [stream, setStream] = useState<StreamState>('connecting')
  const [streamError, setStreamError] = useState('')
  const [lastTelemetryReceivedAt, setLastTelemetryReceivedAt] = useState<number | null>(null)
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
    if (!enabled) return
    const controller = new AbortController()
    let active = true
    let telemetryRevision = 0
    let connectionRevision = 0
    let lastRiskLevel: RiskLevel | null = null
    const addAlert = (value: DangerAlert) => {
      setAlerts((current) => {
        const previous = current.find((item) => item.telemetry.id === value.telemetry.id)
        if (previous && (value.source === 'sensor' || previous.source !== 'sensor')) return current
        return [
          { ...value, receivedAt: Date.now() },
          ...current.filter((item) => item.telemetry.id !== value.telemetry.id),
        ].slice(0, 100)
      })
    }
    const changedReports = new Set<number>()
    let requestNumber = 0
    setStatus(initialStatus)
    setHistory([])
    setAlerts([])
    setStreamError('')
    setLastTelemetryReceivedAt(null)
    setReports([])
    const refreshSnapshot = async () => {
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
    void refreshSnapshot()
    const stop = connectStream(settings, {
      state: (value, message) => {
        if (!active) return
        setStream(value)
        setStreamError((previous) => (value === 'connected' ? '' : message || previous))
      },
      ready: () => {
        if (active) void refreshSnapshot()
      },
      telemetry: (value) => {
        if (!active) return
        telemetryRevision++
        setLastTelemetryReceivedAt(Date.now())
        const risk = value.risk
        if (risk && risk.level !== lastRiskLevel && risk.level !== 'SAFE') {
          addAlert({
            source: 'sensor',
            message:
              risk.reason ||
              (risk.level === 'DANGER'
                ? '위험 상태가 감지되었습니다. 주변을 확인해주세요.'
                : '주의가 필요한 상태입니다. 주변 장애물을 확인해주세요.'),
            robotStopped: false,
            telemetry: value,
          })
        }
        lastRiskLevel = risk?.level ?? null
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
        addAlert({ ...value, source: 'server' })
      },
    })
    return () => {
      active = false
      controller.abort()
      stop()
    }
  }, [api, settings, refresh, updateReport, enabled])

  return {
    demo: false,
    lastCommand: '',
    api,
    status,
    stream,
    streamError,
    lastTelemetryReceivedAt,
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
