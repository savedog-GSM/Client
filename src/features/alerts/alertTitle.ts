import type { DangerAlert } from '../../api/types'

export function alertTitle(alert: DangerAlert) {
  if (alert.telemetry.risk.level === 'CAUTION') return '주의 · 주변 장애물을 확인해주세요'
  return alert.robotStopped
    ? '위험 감지 · 자동 정지 명령 전송'
    : '긴급 · 자동 정지 명령을 보내지 못했습니다'
}
