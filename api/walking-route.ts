import { env } from 'node:process'
import type { WalkingRoute } from '../src/api/types'

interface KakaoRoute {
  status: string
  route?: {
    properties: { totalDistance: number; totalTime: number }
    legs: {
      steps: { properties: { guidance: string; distance: number }; path: { points: number[][] } }[]
    }[]
  }
}

const headers = { 'Cache-Control': 'no-store' }
const failure = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers })

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const coordinates = ['startLat', 'startLng', 'endLat', 'endLng'].map((name) => {
    const value = params.get(name)
    return value?.trim() ? Number(value) : NaN
  })
  if (
    coordinates.some(
      (value, index) => !Number.isFinite(value) || Math.abs(value) > (index % 2 ? 180 : 90),
    )
  ) {
    return failure(400, 'INVALID_COORDINATES', '출발지와 도착지를 다시 선택해주세요.')
  }
  const key = env.KAKAO_REST_API_KEY?.trim()
  if (!key)
    return failure(503, 'WALKING_NOT_CONFIGURED', '카카오 도보 길찾기 연결 설정이 필요합니다.')
  const [startLat, startLng, endLat, endLng] = coordinates
  const query = new URLSearchParams({
    start_x: String(startLng),
    start_y: String(startLat),
    end_x: String(endLng),
    end_y: String(endLat),
    input_coord: 'WGS84',
    output_coord: 'WGS84',
    route_mode: 'BROAD_FIRST',
  })
  try {
    const response = await fetch(`https://dapi.kakao.com/v2/routing/walk?${query}`, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) {
      return failure(503, 'KAKAO_AUTH_ERROR', '카카오 도보 API 키 또는 사용 권한을 확인해주세요.')
    }
    if (response.status === 429)
      return failure(429, 'KAKAO_LIMIT', '도보 길찾기 요청이 많습니다. 잠시 후 다시 시도해주세요.')
    if (!response.ok)
      return failure(502, 'KAKAO_UNAVAILABLE', '카카오 도보 길찾기에 연결하지 못했습니다.')
    const data = (await response.json()) as KakaoRoute
    if (data.status !== 'OK') {
      const messages: Record<string, string> = {
        SAME_POINT: '출발지와 도착지가 같습니다. 다른 위치를 선택해주세요.',
        START_LINK_NOT_FOUND:
          '출발지 주변의 보행 도로를 찾지 못했습니다. 가까운 도로를 선택해주세요.',
        END_LINK_NOT_FOUND:
          '도착지 주변의 보행 도로를 찾지 못했습니다. 가까운 도로를 선택해주세요.',
        TOO_FAR_AWAY: '도보로 탐색하기에는 출발지와 도착지가 너무 멉니다.',
        ROUTE_RESULT_NOT_FOUND: '두 지점을 잇는 도보 경로를 찾지 못했습니다.',
        TOO_MANY_SEARCH_LINK: '도보 경로 탐색 범위가 너무 넓습니다. 가까운 지점을 선택해주세요.',
      }
      if (messages[data.status]) return failure(422, data.status, messages[data.status])
      return failure(502, 'INVALID_KAKAO_RESPONSE', '카카오 도보 경로 응답을 확인할 수 없습니다.')
    }
    const route = data.route!
    const steps = route.legs.flatMap((leg) => leg.steps)
    const points = steps.flatMap((step) => step.path.points)
    if (
      points.length < 2 ||
      points.some(
        (point) =>
          point.length !== 2 ||
          !Number.isFinite(point[0]) ||
          !Number.isFinite(point[1]) ||
          Math.abs(point[0]) > 180 ||
          Math.abs(point[1]) > 90,
      ) ||
      !Number.isFinite(route.properties.totalDistance) ||
      route.properties.totalDistance < 0 ||
      !Number.isFinite(route.properties.totalTime) ||
      route.properties.totalTime < 0 ||
      steps.some(
        (step) =>
          typeof step.properties.guidance !== 'string' ||
          !Number.isFinite(step.properties.distance) ||
          step.properties.distance < 0,
      )
    ) {
      return failure(502, 'INVALID_KAKAO_RESPONSE', '카카오 도보 경로 응답을 확인할 수 없습니다.')
    }
    const result: WalkingRoute = {
      provider: 'KAKAO',
      path: points.map(([longitude, latitude]) => ({ latitude, longitude })),
      distanceMeters: route.properties.totalDistance,
      durationSeconds: route.properties.totalTime,
      steps: steps.map((step) => ({
        instruction: step.properties.guidance,
        distanceMeters: step.properties.distance,
      })),
    }
    return Response.json(result, { headers })
  } catch {
    return failure(
      502,
      'KAKAO_UNAVAILABLE',
      '카카오 도보 경로를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    )
  }
}
