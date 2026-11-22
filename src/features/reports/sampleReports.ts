import type { Report } from '../../api/types'

export interface SampleReport extends Report {
  photoUrl: string
}

export const sampleReports: SampleReport[] = [
  {
    id: 901,
    hazardType: 'ROUGH_ROAD',
    latitude: 35.14352,
    longitude: 126.80042,
    address: '광주광역시 광산구 상무대로 312 인근',
    description: '보도블럭이 파여 있어 보행 중 발이 걸릴 위험이 있습니다.',
    risk: { level: 'DANGER', score: 5, reason: '보도블럭 파임 감지' },
    hasPhoto: true,
    status: 'PENDING',
    receiptNumber: null,
    createdAt: '2026-11-22T10:00:00',
    submittedAt: null,
    photoUrl: '/demo/tactile-paving-damage-1.png',
  },
  {
    id: 902,
    hazardType: 'ROUGH_ROAD',
    latitude: 35.14371,
    longitude: 126.80098,
    address: '광주광역시 광산구 송정공원로 15 인근',
    description: '보도블럭 단차가 커서 흰지팡이 사용자가 위험을 인지하기 어렵습니다.',
    risk: { level: 'DANGER', score: 5, reason: '보행로 단차 감지' },
    hasPhoto: true,
    status: 'PENDING',
    receiptNumber: null,
    createdAt: '2026-11-22T09:45:00',
    submittedAt: null,
    photoUrl: '/demo/tactile-paving-damage-2.png',
  },
  {
    id: 903,
    hazardType: 'OBSTACLE',
    latitude: 35.14311,
    longitude: 126.80117,
    address: '광주광역시 광산구 광산로 29 인근',
    description: '파손된 보도블럭 주변에 장애물이 있어 우회가 필요합니다.',
    risk: { level: 'CAUTION', score: 4, reason: '파손 보도블럭과 장애물 감지' },
    hasPhoto: true,
    status: 'PENDING',
    receiptNumber: null,
    createdAt: '2026-11-22T09:20:00',
    submittedAt: null,
    photoUrl: '/demo/tactile-paving-damage-1.png',
  },
]
