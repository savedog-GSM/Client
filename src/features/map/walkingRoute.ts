import { ApiError } from '../../api/client'
import type { Point, WalkingRoute } from '../../api/types'

export async function searchWalkingRoute(
  start: Point,
  end: Point,
  signal: AbortSignal,
): Promise<WalkingRoute> {
  const query = new URLSearchParams({
    startLat: String(start.latitude),
    startLng: String(start.longitude),
    endLat: String(end.latitude),
    endLng: String(end.longitude),
  })
  const response = await fetch(`/api/walking-route?${query}`, { signal, cache: 'no-store' })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new ApiError(
      response.status,
      result?.code ?? 'WALKING_ERROR',
      result?.message ?? '도보 경로를 불러오지 못했습니다.',
    )
  if (
    result?.provider !== 'KAKAO' ||
    !Array.isArray(result.path) ||
    result.path.length < 2 ||
    !Number.isFinite(result.distanceMeters) ||
    !Number.isFinite(result.durationSeconds) ||
    !Array.isArray(result.steps)
  ) {
    throw new ApiError(
      502,
      'INVALID_WALKING_ROUTE',
      '도보 경로 정보를 확인할 수 없습니다. 길찾기 서버 배포 상태를 확인해주세요.',
    )
  }
  return result
}
