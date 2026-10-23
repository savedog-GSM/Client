import type { Point } from '../../api/types'

export type FacilityCategory = 'TOILET' | 'CONVENIENCE_STORE'
export interface FacilityOrigin extends Point {
  accuracy: number
}
export interface FacilityRoute {
  facility: Point & {
    id: string
    category: FacilityCategory
    name: string
    address: string
  }
  route: {
    distanceMeters: number
    durationSeconds: number
    path: Point[]
    steps: { instruction: string; distanceMeters: number }[]
  }
}
export const facilityNames: Record<FacilityCategory, string> = {
  TOILET: '화장실',
  CONVENIENCE_STORE: '편의점',
}
