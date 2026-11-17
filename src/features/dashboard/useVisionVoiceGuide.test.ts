import { expect, it } from 'vitest'
import type { VisionResult } from '../../api/types'
import { visionVoiceMessage } from './useVisionVoiceGuide'

const result: VisionResult = {
  available: true,
  fresh: true,
  frameReceivedAt: '2026-11-17T09:00:00',
  analyzedAt: '2026-11-17T09:00:00',
  elapsedMs: 80,
  score: 3,
  level: 'CAUTION',
  reason: null,
  detections: [],
}

it('사람과 보도블럭 위험을 음성 안내 문구로 바꾼다', () => {
  expect(
    visionVoiceMessage(
      {
        ...result,
        detections: [
          { label: 'person', name: '사람', confidence: 0.9, left: 0, top: 0, right: 1, bottom: 1 },
        ],
      },
      true,
    ),
  ).toBe('앞에 사람이 있어요. 주의하세요.')
  expect(
    visionVoiceMessage(
      {
        ...result,
        detections: [
          {
            label: 'pothole',
            name: '보도블럭 파임',
            confidence: 0.9,
            left: 0,
            top: 0,
            right: 1,
            bottom: 1,
          },
        ],
      },
      true,
    ),
  ).toBe('앞에 보도블럭이 파여 있어요. 주의하세요.')
})

it('안전한 빈 화면은 보도블럭 상태를 안내한다', () => {
  expect(visionVoiceMessage({ ...result, level: 'SAFE' }, true)).toBe(
    '전방 보도블럭 상태가 양호해요.',
  )
})
