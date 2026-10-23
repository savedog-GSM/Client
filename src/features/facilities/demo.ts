import { demoPosition } from '../demo/session'
import type { FacilityCategory, FacilityRoute } from './types'

export function demoFacilityRoute(category: FacilityCategory): FacilityRoute {
  const toilet = category === 'TOILET'
  const corner = { latitude: demoPosition.latitude + 0.0005, longitude: demoPosition.longitude }
  const destination = {
    latitude: corner.latitude,
    longitude: corner.longitude + (toilet ? 0.0006 : -0.0008),
  }
  return {
    facility: {
      id: toilet ? 'demo-toilet' : 'demo-store',
      category,
      name: toilet ? '시연용 화장실' : '시연용 편의점',
      address: '예시 주소 · 실제 시설이 아닙니다',
      ...destination,
    },
    route: {
      distanceMeters: toilet ? 110 : 130,
      durationSeconds: toilet ? 120 : 150,
      path: [demoPosition, corner, destination],
      steps: [
        { instruction: '예시 경로의 첫 번째 모퉁이까지 이동합니다.', distanceMeters: 55 },
        { instruction: '예시 목적지 방향으로 이동합니다.', distanceMeters: toilet ? 55 : 75 },
      ],
    },
  }
}
