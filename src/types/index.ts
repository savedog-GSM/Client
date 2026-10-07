export type RiskLevel = 'safe' | 'warning' | 'danger'

export interface SensorData {
  distance: number
  roll: number
  pitch: number
  timestamp: number
}

export interface Alert {
  id: string
  level: RiskLevel
  title: string
  message: string
  timestamp: number
}

export interface Route {
  id: string
  name: string
  nodes: string[]
  distance: number
  averageRisk: number
  obstacleCount: number
  tiltScore: number
  executionCount: number
}

export interface RouteRecord {
  id: string
  routeId: string
  timestamp: number
  distance: number
  riskScore: number
  obstacleCount: number
  duration: number
}