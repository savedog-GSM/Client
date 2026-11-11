import type { OwnerDirection, OwnerReturnStatus } from '../../api/types'

export const returnStatusNames: Record<OwnerReturnStatus, string> = {
  IDLE: '대기 중',
  WAITING_FOR_ROBOT_LOCATION: '로보독 위치 확인 중',
  FINDING_HEADING: '이동 방향 확인 중',
  NAVIGATING: '주인에게 이동 중',
  TURNING: '경로 방향 전환 중',
  APPROACHING_BY_FACE: '주인 얼굴을 보고 접근 중',
  BLOCKED_BY_OBSTACLE: '장애물로 일시 정지',
  NO_SAFE_ROUTE: '안전 경로 재탐색 중',
  ROBOT_DISCONNECTED: '로보독 연결 대기 중',
  ARRIVED: '주인에게 도착',
  GAVE_UP: '돌아가기 종료',
}

export const directionNames: Record<OwnerDirection, string> = {
  LEFT: '화면 왼쪽',
  CENTER: '화면 가운데',
  RIGHT: '화면 오른쪽',
}
