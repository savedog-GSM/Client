import type { Alert, RiskLevel, SensorData } from '../types'

export const calculateRisk = (sensor: SensorData): RiskLevel => {
  if (sensor.distance < 250 || Math.abs(sensor.roll) >= 15 || Math.abs(sensor.pitch) >= 15) {
    return 'danger'
  }

  if (sensor.distance < 500 || Math.abs(sensor.roll) >= 8 || Math.abs(sensor.pitch) >= 8) {
    return 'warning'
  }

  return 'safe'
}

export const calculateRiskScore = (sensor: SensorData) => {
  let score = 0

  if (sensor.distance < 500) score += 30
  if (sensor.distance < 250) score += 40

  score += Math.min(Math.abs(sensor.roll) * 1.5, 15)
  score += Math.min(Math.abs(sensor.pitch) * 1.5, 15)

  return Math.min(Math.round(score), 100)
}

export const createAlert = (sensor: SensorData): Alert | null => {
  const level = calculateRisk(sensor)

  if (level === 'safe') return null

  if (sensor.distance < 250) {
    return {
      id: crypto.randomUUID(),
      level: 'danger',
      title: '전방 장애물 접근',
      message: `전방 ${Math.round(sensor.distance)}mm 이내에서 장애물이 감지되었습니다.`,
      timestamp: Date.now(),
    }
  }

  if (Math.abs(sensor.roll) >= 15) {
    return {
      id: crypto.randomUUID(),
      level: 'danger',
      title: '좌우 기울기 위험',
      message: `로보독이 좌우로 ${Math.abs(sensor.roll).toFixed(1)}° 기울어졌습니다.`,
      timestamp: Date.now(),
    }
  }

  if (Math.abs(sensor.pitch) >= 15) {
    return {
      id: crypto.randomUUID(),
      level: 'danger',
      title: '앞뒤 기울기 위험',
      message: `로보독이 앞뒤로 ${Math.abs(sensor.pitch).toFixed(1)}° 기울어졌습니다.`,
      timestamp: Date.now(),
    }
  }

  if (sensor.distance < 500) {
    return {
      id: crypto.randomUUID(),
      level: 'warning',
      title: '전방 장애물 주의',
      message: `전방 ${Math.round(sensor.distance)}mm 거리에 장애물이 있습니다.`,
      timestamp: Date.now(),
    }
  }

  return {
    id: crypto.randomUUID(),
    level: 'warning',
    title: '기울기 주의',
    message: '로보독의 자세가 평소보다 크게 기울어졌습니다.',
    timestamp: Date.now(),
  }
}