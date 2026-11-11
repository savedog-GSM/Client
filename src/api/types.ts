export type RiskLevel = 'SAFE' | 'CAUTION' | 'DANGER'
export interface Risk {
  level: RiskLevel
  score: number
  reason: string | null
}
export interface Point {
  latitude: number
  longitude: number
}
export interface Sensor {
  distance: number | null
  temperature: number | null
  humidity: number | null
}
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
export interface Segment {
  level: RiskLevel
  path: Point[]
}
export interface SafetyRecord extends Point {
  id: number
  risk: Risk
  assessedAt: string
}
export type PathMode = 'SAFEST' | 'SHORTEST'
export interface PathResult {
  mode: PathMode
  path: Point[]
  distanceMeters: number
  averageRiskScore: number
  maxRiskLevel: RiskLevel
}
export interface WalkingRoute {
  provider: 'KAKAO'
  path: Point[]
  distanceMeters: number
  durationSeconds: number
  steps: { instruction: string; distanceMeters: number }[]
}
export type CommandType =
  'STOP' | 'BARK' | 'SIT' | 'FORWARD' | 'BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT'
export interface Command {
  type: CommandType
  speed?: number
  durationMs?: number
}
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
export interface DangerAlert {
  source?: 'sensor' | 'server'
  receivedAt?: number
  message: string
  robotStopped: boolean
  telemetry: Telemetry
}
export interface LocationInput extends Point {
  accuracy?: number
  speed?: number
}
export interface ConnectionSettings {
  apiUrl: string
  operatorToken: string
  deviceToken: string
}
export interface VisionDetection {
  label: string
  name: string
  confidence: number
  left: number
  top: number
  right: number
  bottom: number
}
export interface VisionResult {
  available: boolean
  fresh: boolean
  frameReceivedAt: string | null
  analyzedAt: string | null
  elapsedMs: number | null
  score: number | null
  level: RiskLevel | null
  reason: string | null
  detections: VisionDetection[]
}

export interface OwnerFaceResult {
  id: number
  faceScore: number
  similarityToOthers: number | null
  registeredCount: number
  createdAt: string
}

export interface OwnerFaceDeleteResult {
  deleted: number
  remaining: number
}

export type OwnerDirection = 'LEFT' | 'CENTER' | 'RIGHT'

export interface OwnerSighting {
  frameReceivedAt: string
  analyzedAt: string
  facesInFrame: number
  ownerVisible: boolean
  similarity: number | null
  horizontalOffset: number | null
  verticalOffset: number | null
  direction: OwnerDirection | null
  faceWidthRatio: number | null
}

export interface OwnerSightingResult {
  available: boolean
  registeredFaces: number
  fresh: boolean
  ownerVisible: boolean
  sighting: OwnerSighting | null
}

export type OwnerReturnStatus =
  | 'IDLE'
  | 'WAITING_FOR_ROBOT_LOCATION'
  | 'FINDING_HEADING'
  | 'NAVIGATING'
  | 'TURNING'
  | 'APPROACHING_BY_FACE'
  | 'BLOCKED_BY_OBSTACLE'
  | 'NO_SAFE_ROUTE'
  | 'ROBOT_DISCONNECTED'
  | 'ARRIVED'
  | 'GAVE_UP'

export interface OwnerReturnResult {
  active: boolean
  status: OwnerReturnStatus
  message: string
  owner: Point | null
  ownerAccuracy: number | null
  ownerUpdatedAt: string | null
  robot: Point | null
  distanceMeters: number | null
  route: Point[]
  lastCommand: CommandType | null
  lastCommandAt: string | null
  startedAt: string | null
  finishedAt: string | null
}
