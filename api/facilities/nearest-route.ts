import { env } from 'node:process'
import type { Point, WalkingRoute } from '../../src/api/types'
import type { FacilityCategory, FacilityRoute } from '../../src/features/facilities/types'
import { GET as getWalkingRoute } from '../walking-route'

interface PlaceDocument {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  x: string
  y: string
}

const headers = { 'Cache-Control': 'no-store' }
const failure = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers })

function isPoint(value: unknown): value is Point {
  const point = value as Point | null
  return (
    Number.isFinite(point?.latitude) &&
    Math.abs(point!.latitude) <= 90 &&
    Number.isFinite(point?.longitude) &&
    Math.abs(point!.longitude) <= 180
  )
}

function placeSearchUrl(category: FacilityCategory, origin: Point) {
  const params = new URLSearchParams({
    x: String(origin.longitude),
    y: String(origin.latitude),
    radius: '20000',
    sort: 'distance',
    size: '1',
  })
  if (category === 'CONVENIENCE_STORE') {
    params.set('category_group_code', 'CS2')
    return `https://dapi.kakao.com/v2/local/search/category.json?${params}`
  }
  params.set('query', '화장실')
  return `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const category = body?.category as FacilityCategory | undefined
  const origin = body?.origin
  if (!['TOILET', 'CONVENIENCE_STORE'].includes(category ?? '') || !isPoint(origin)) {
    return failure(400, 'INVALID_REQUEST', '시설 종류와 현재 위치를 다시 확인해주세요.')
  }
  const key = env.KAKAO_REST_API_KEY?.trim()
  if (!key) return failure(503, 'FEATURE_NOT_READY', '카카오 편의시설 검색 연결 설정이 필요합니다.')
  try {
    const placeResponse = await fetch(placeSearchUrl(category!, origin), {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (placeResponse.status === 401 || placeResponse.status === 403)
      return failure(503, 'PROVIDER_UNAVAILABLE', '카카오 API 키 또는 사용 권한을 확인해주세요.')
    if (placeResponse.status === 429)
      return failure(
        429,
        'PROVIDER_UNAVAILABLE',
        '시설 검색 요청이 많습니다. 잠시 후 다시 시도해주세요.',
      )
    if (!placeResponse.ok)
      return failure(502, 'PROVIDER_UNAVAILABLE', '카카오 시설 검색에 연결하지 못했습니다.')

    const placeData = (await placeResponse.json()) as { documents?: PlaceDocument[] }
    const place = placeData.documents?.[0]
    const facility = place && {
      id: place.id,
      category: category!,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      latitude: Number(place.y),
      longitude: Number(place.x),
    }
    if (!facility) return failure(404, 'FACILITY_NOT_FOUND', '주변 시설을 찾지 못했습니다.')
    if (!facility.id || !facility.name || !isPoint(facility))
      return failure(502, 'PROVIDER_UNAVAILABLE', '카카오 시설 검색 결과를 확인할 수 없습니다.')

    const routeUrl = new URL('/api/walking-route', request.url)
    routeUrl.search = new URLSearchParams({
      startLat: String(origin.latitude),
      startLng: String(origin.longitude),
      endLat: String(facility.latitude),
      endLng: String(facility.longitude),
    }).toString()
    const routeResponse = await getWalkingRoute(new Request(routeUrl))
    if (!routeResponse.ok)
      return failure(422, 'PATH_NOT_FOUND', '해당 시설까지 안내할 수 있는 보행 경로가 없습니다.')
    const walkingRoute = (await routeResponse.json()) as WalkingRoute
    const result: FacilityRoute = {
      facility,
      route: {
        distanceMeters: walkingRoute.distanceMeters,
        durationSeconds: walkingRoute.durationSeconds,
        path: walkingRoute.path,
        steps: walkingRoute.steps,
      },
    }
    return Response.json(result, { headers })
  } catch {
    return failure(502, 'PROVIDER_UNAVAILABLE', '카카오 편의시설 경로를 불러오지 못했습니다.')
  }
}
