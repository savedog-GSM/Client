import { afterEach, expect, it, vi } from 'vitest'
import { searchWalkingRoute } from './walkingRoute'

afterEach(() => vi.unstubAllGlobals())
const start = { latitude: 35.14332, longitude: 126.80079 }
const end = { latitude: 35.15, longitude: 126.81 }

it('관제 토큰 없이 같은 출처의 함수에 좌표와 취소 신호를 보낸다', async () => {
  const route = {
    provider: 'KAKAO',
    path: [start, end],
    distanceMeters: 1200,
    durationSeconds: 900,
    steps: [],
  }
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(route)))
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  await expect(searchWalkingRoute(start, end, controller.signal)).resolves.toEqual(route)
  const [url, options] = fetch.mock.calls[0]
  expect(url).toBe(
    '/api/walking-route?startLat=35.14332&startLng=126.80079&endLat=35.15&endLng=126.81',
  )
  expect(options.signal).toBe(controller.signal)
  expect(options.headers).toBeUndefined()
})

it('배포되지 않은 함수가 HTML을 반환하면 경로로 취급하지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>SPA</html>')))
  await expect(searchWalkingRoute(start, end, new AbortController().signal)).rejects.toMatchObject({
    code: 'INVALID_WALKING_ROUTE',
  })
})

it('키가 없으면 함수의 설정 안내를 표시한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'WALKING_NOT_CONFIGURED',
          message: '카카오 도보 길찾기 연결 설정이 필요합니다.',
        }),
        { status: 503 },
      ),
    ),
  )
  await expect(searchWalkingRoute(start, end, new AbortController().signal)).rejects.toMatchObject({
    code: 'WALKING_NOT_CONFIGURED',
    message: '카카오 도보 길찾기 연결 설정이 필요합니다.',
  })
})
