export type RiskLevel = 'SAFE' | 'CAUTION' | 'DANGER'
export interface Risk { level: RiskLevel; score: number; reason: string | null }
export interface Point { latitude: number; longitude: number }
export interface Sensor { distance: number | null; roll: number | null; pitch: number | null }
export interface Telemetry {
  id: number
  latitude: number | null
  longitude: number | null
  speed: number | null
  sensor: Sensor
  risk: Risk
  recordedAt: string
}
export interface RobotStatus {
  connected: boolean
  lastSeenAt: string | null
  lastLocationAt: string | null
  latitude: number | null
  longitude: number | null
  speed: number | null
  sensor: Sensor | null
  risk: Risk | null
}
export interface Segment { level: RiskLevel; path: Point[] }
export interface SafetyRecord extends Point { id: number; risk: Risk; assessedAt: string }
export type PathMode = 'SAFEST' | 'SHORTEST'
export interface PathResult {
  mode: PathMode
  path: Point[]
  distanceMeters: number
  averageRiskScore: number
  maxRiskLevel: RiskLevel
}
export type CommandType = 'STOP' | 'BARK' | 'SIT' | 'FORWARD' | 'BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT'
export interface Command { type: CommandType; speed?: number; durationMs?: number }
export type ReportStatus = 'PENDING' | 'SUBMITTED' | 'DISMISSED' | 'FAILED'
export interface Report extends Point {
  id: number
  hazardType: 'OBSTACLE' | 'ROUGH_ROAD' | 'ETC'
  address: string | null
  description: string
  risk: Risk
  hasPhoto: boolean
  status: ReportStatus
  receiptNumber: string | null
  createdAt: string
  submittedAt: string | null
}
export interface DangerAlert { message: string; robotStopped: boolean; telemetry: Telemetry }
export interface LocationInput extends Point { accuracy?: number; speed?: number }
export interface ConnectionSettings { apiUrl: string; operatorToken: string; deviceToken: string }
