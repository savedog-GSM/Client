import type { ConnectionSettings, Report, RobotStatus, Telemetry } from '../api/types'

export const settings: ConnectionSettings = {
  apiUrl: 'http://localhost:8080',
  operatorToken: 'operator-test',
  deviceToken: 'device-test',
}
export const telemetry: Telemetry = {
  id: 1,
  latitude: 37.5665,
  longitude: 126.978,
  speed: 0.4,
  sensor: { distance: 15, roll: 0, pitch: null },
  risk: { level: 'DANGER', score: 5, reason: '전방 15cm 장애물' },
  recordedAt: '2026-10-19T15:30:00',
}
export const status: RobotStatus = {
  connected: true,
  lastSeenAt: telemetry.recordedAt,
  lastLocationAt: telemetry.recordedAt,
  latitude: telemetry.latitude,
  longitude: telemetry.longitude,
  speed: telemetry.speed,
  sensor: telemetry.sensor,
  risk: telemetry.risk,
}
export const report: Report = {
  id: 2,
  hazardType: 'OBSTACLE',
  latitude: 37.5665,
  longitude: 126.978,
  address: null,
  description: '전방 장애물이 지속적으로 감지되었습니다.',
  risk: telemetry.risk,
  hasPhoto: false,
  status: 'PENDING',
  receiptNumber: null,
  createdAt: telemetry.recordedAt,
  submittedAt: null,
}
