import type { Api } from '../../api/client'
import type { DangerAlert, Point, Report, Risk, RiskLevel, Telemetry } from '../../api/types'

export const demoPosition: Point = { latitude: 35.14332, longitude: 126.80079 }
const risks: Record<RiskLevel, Risk> = {
  SAFE: { level: 'SAFE', score: 1, reason: '시연 · 장애물 없음' },
  CAUTION: { level: 'CAUTION', score: 3, reason: '시연 · 전방 장애물 주의' },
  DANGER: { level: 'DANGER', score: 5, reason: '시연 · 전방 장애물 감지, 자동 정지' },
}

export function createDemoSession() {
  let sequence = 100
  let commandId = 0
  let movingUntil = 0
  let speed = 0
  let point = { ...demoPosition }
  let level: RiskLevel = 'SAFE'
  const listeners = new Set<() => void>()
  function sample(at: number, riskLevel = level): Telemetry {
    return {
      id: sequence++,
      ...point,
      speed,
      sensor: {
        distance:
          riskLevel === 'DANGER' ? 15 : riskLevel === 'CAUTION' ? 42 : 130 + Math.sin(sequence) * 4,
        roll: Math.sin(sequence / 3) * 2,
        pitch: Math.cos(sequence / 4) * 3,
      },
      risk: risks[riskLevel],
      recordedAt: new Date(at).toISOString(),
    }
  }
  function newReport(id: number): Report {
    return {
      id,
      ...point,
      hazardType: 'OBSTACLE',
      address: '광주광역시 광산구 (시연 위치)',
      description: '시연용 보행로 장애물 신고입니다.',
      risk: risks.DANGER,
      hasPhoto: true,
      status: 'PENDING',
      receiptNumber: null,
      createdAt: new Date().toISOString(),
      submittedAt: null,
    }
  }
  const seeded = Array.from({ length: 60 }, (_, index) =>
    sample(Date.now() - (59 - index) * 1000, index > 25 && index < 35 ? 'CAUTION' : 'SAFE'),
  )
  let snapshot = {
    history: seeded,
    status: statusFrom(seeded[59]),
    alerts: [
      {
        message: '시연 · 전방 장애물이 감지되었습니다.',
        robotStopped: true,
        telemetry: sample(Date.now() - 20000, 'DANGER'),
      },
    ] as DangerAlert[],
    reports: [newReport(1)],
    now: Date.now(),
    lastCommand: '',
  }
  function statusFrom(value: Telemetry) {
    return {
      ...value,
      connected: true,
      lastSeenAt: value.recordedAt,
      lastLocationAt: value.recordedAt,
    }
  }
  function publish() {
    listeners.forEach((listener) => listener())
  }
  function tick() {
    if (Date.now() >= movingUntil) speed = 0
    if (speed > 0) point = { ...point, latitude: point.latitude + speed / 111000 }
    const value = sample(Date.now())
    snapshot = {
      ...snapshot,
      now: Date.now(),
      status: statusFrom(value),
      history: [...snapshot.history, value].slice(-600),
    }
    publish()
  }
  function updateReport(report: Report) {
    snapshot = {
      ...snapshot,
      reports: [report, ...snapshot.reports.filter((item) => item.id !== report.id)],
    }
    publish()
  }
  function findReport(id: number) {
    const report = snapshot.reports.find((item) => item.id === id)
    if (!report) throw new Error('시연 신고를 찾을 수 없습니다.')
    return report
  }
  const api: Api = {
    status: async () => snapshot.status,
    telemetry: async (from = '', to = '') =>
      snapshot.history.filter(
        (item) =>
          (!from || Date.parse(item.recordedAt) >= Date.parse(from)) &&
          (!to || Date.parse(item.recordedAt) <= Date.parse(to)),
      ),
    segments: async () => [
      { level: 'SAFE', path: [demoPosition, { latitude: 35.1438, longitude: 126.80079 }] },
      {
        level: 'CAUTION',
        path: [
          { latitude: 35.1438, longitude: 126.80079 },
          { latitude: 35.1441, longitude: 126.80079 },
        ],
      },
    ],
    records: async (bounds) =>
      snapshot.reports
        .filter(
          (report) =>
            report.latitude >= bounds.swLat &&
            report.latitude <= bounds.neLat &&
            report.longitude >= bounds.swLng &&
            report.longitude <= bounds.neLng,
        )
        .map((report) => ({ ...report, assessedAt: report.createdAt })),
    searchPath: async (start, end, mode) => {
      const middle =
        mode === 'SAFEST'
          ? { latitude: start.latitude, longitude: end.longitude }
          : {
              latitude: (start.latitude + end.latitude) / 2,
              longitude: (start.longitude + end.longitude) / 2,
            }
      const path = [start, middle, end]
      const distanceMeters = path
        .slice(1)
        .reduce(
          (sum, item, index) =>
            sum +
            Math.hypot(
              (item.latitude - path[index].latitude) * 111000,
              (item.longitude - path[index].longitude) *
                111000 *
                Math.cos((item.latitude * Math.PI) / 180),
            ),
          0,
        )
      return {
        mode,
        path,
        distanceMeters,
        averageRiskScore: mode === 'SAFEST' ? 1 : 3,
        maxRiskLevel: mode === 'SAFEST' ? 'SAFE' : 'CAUTION',
      }
    },
    command: async (command) => {
      commandId++
      const moving = ['FORWARD', 'BACKWARD', 'TURN_LEFT', 'TURN_RIGHT'].includes(command.type)
      speed = moving && level !== 'DANGER' ? (command.speed ?? 30) / 100 : 0
      movingUntil = Date.now() + (command.durationMs ?? 1000)
      snapshot = { ...snapshot, lastCommand: `${command.type} · 시연 명령 #${commandId}` }
      tick()
      return { commandId, type: command.type, sentAt: new Date().toISOString() }
    },
    reports: async () => snapshot.reports,
    report: async (id) => findReport(id),
    submit: async (id, receiptNumber) => {
      const report: Report = {
        ...findReport(id),
        status: 'SUBMITTED',
        receiptNumber,
        submittedAt: new Date().toISOString(),
      }
      updateReport(report)
      return report
    },
    dismiss: async (id) => {
      const report: Report = { ...findReport(id), status: 'DISMISSED' }
      updateReport(report)
      return report
    },
    photo: async (id) => {
      findReport(id)
      return { url: '/demo/obstacle.svg' }
    },
    frame: async () => ({ url: '/demo/obstacle.svg' }),
    location: async (value) => {
      point = { latitude: value.latitude, longitude: value.longitude }
      tick()
    },
  }
  return {
    api,
    tick,
    updateReport,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    setRisk: (next: RiskLevel) => {
      if (next === level) return
      level = next
      if (next === 'DANGER') speed = 0
      tick()
      if (next !== 'SAFE') {
        snapshot = {
          ...snapshot,
          alerts: [
            {
              message: risks[next].reason!,
              robotStopped: next === 'DANGER',
              telemetry: snapshot.history.at(-1)!,
            },
            ...snapshot.alerts,
          ].slice(0, 100),
        }
        if (next === 'DANGER') updateReport(newReport(sequence++))
        else publish()
      }
    },
  }
}
