import { ApiError } from '../../api/client'
import type { ConnectionSettings, Point } from '../../api/types'
import type { FacilityCategory, FacilityOrigin, FacilityRoute } from './types'

function isPoint(value: Point) {
  return (
    value &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180
  )
}
function nonnegative(value: number) {
  return Number.isFinite(value) && value >= 0
}
function parseRoute(raw: unknown, category: FacilityCategory): FacilityRoute {
  const value = raw as FacilityRoute | null
  if (
    !value?.facility ||
    !value.route ||
    !isPoint(value.facility) ||
    value.facility.category !== category ||
    typeof value.facility.id !== 'string' ||
    !value.facility.id.trim() ||
    typeof value.facility.name !== 'string' ||
    !value.facility.name.trim() ||
    typeof value.facility.address !== 'string' ||
    !nonnegative(value.route.distanceMeters) ||
    !nonnegative(value.route.durationSeconds) ||
    !Array.isArray(value.route.path) ||
    value.route.path.length < 2 ||
    !value.route.path.every(isPoint) ||
    !Array.isArray(value.route.steps) ||
    !value.route.steps.length ||
    !value.route.steps.every(
      (step) =>
        step &&
        typeof step.instruction === 'string' &&
        step.instruction.trim() &&
        nonnegative(step.distanceMeters),
    )
  ) {
    throw new ApiError(
      502,
      'INVALID_ROUTE',
      '경로 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
    )
  }
  return value
}

export function createFacilitiesApi(settings: ConnectionSettings) {
  return {
    async nearestRoute(category: FacilityCategory, origin: FacilityOrigin, signal: AbortSignal) {
      const controller = new AbortController()
      let timedOut = false
      const abort = () => controller.abort()
      if (signal.aborted) abort()
      signal.addEventListener('abort', abort, { once: true })
      const timer = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, 15000)
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (settings.operatorToken) headers.Authorization = `Bearer ${settings.operatorToken}`
        const response = await fetch('/api/facilities/nearest-route', {
          method: 'POST',
          headers,
          body: JSON.stringify({ category, origin }),
          signal: controller.signal,
          cache: 'no-store',
        })
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          if (
            (response.status === 404 &&
              !['FACILITY_NOT_FOUND', 'PATH_NOT_FOUND'].includes(body?.code)) ||
            response.status === 501 ||
            body?.code === 'FEATURE_NOT_READY'
          ) {
            throw new ApiError(
              response.status,
              'FEATURE_NOT_READY',
              '편의시설 경로 안내가 아직 준비되지 않았습니다. 준비가 끝나면 이용할 수 있습니다.',
            )
          }
          const messages: Record<string, string> = {
            FACILITY_NOT_FOUND: '주변에서 이용할 수 있는 시설을 찾지 못했습니다.',
            PATH_NOT_FOUND: '해당 시설까지 안내할 수 있는 보행 경로가 없습니다.',
            LOCATION_INACCURATE: '현재 위치가 정확하지 않습니다. 위치를 다시 확인해주세요.',
            PROVIDER_UNAVAILABLE: '경로 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
          }
          throw new ApiError(
            response.status,
            body?.code ?? 'HTTP_ERROR',
            messages[body?.code] ?? '편의시설을 찾지 못했습니다. 잠시 후 다시 시도해주세요.',
          )
        }
        return parseRoute(body, category)
      } catch (error) {
        if (signal.aborted) throw new DOMException('검색을 취소했습니다.', 'AbortError')
        if (timedOut) throw new Error('검색 시간이 초과되었습니다. 다시 시도해주세요.')
        if (error instanceof ApiError) throw error
        throw new Error('서버에 연결할 수 없습니다. 연결 상태를 확인해주세요.')
      } finally {
        window.clearTimeout(timer)
        signal.removeEventListener('abort', abort)
      }
    },
  }
}
