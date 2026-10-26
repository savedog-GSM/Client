import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GET } from '../../api/walking-route'

const url =
  'https://savedog.vercel.app/api/walking-route?startLat=35.14332&startLng=126.80079&endLat=35.15&endLng=126.81'
const payload = {
  status: 'OK',
  route: {
    properties: { totalDistance: 1200, totalTime: 900 },
    legs: [
      {
        steps: [
          {
            properties: { guidance: '횡단보도까지 이동', distance: 1200 },
            path: {
              points: [
                [126.80079, 35.14332],
                [126.805, 35.146],
                [126.81, 35.15],
              ],
            },
          },
        ],
      },
    ],
  },
}
beforeEach(() => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'private-test-key')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('도보 API 좌표를 경도·위도 순으로 보내고 지도용 좌표와 안내를 반환한다', async () => {
  const response = await GET(new Request(url))
  const result = await response.json()
  const [requested, options] = vi.mocked(fetch).mock.calls[0]
  const upstream = new URL(String(requested))
  expect(upstream.origin + upstream.pathname).toBe('https://dapi.kakao.com/v2/routing/walk')
  expect(upstream.searchParams.get('start_x')).toBe('126.80079')
  expect(upstream.searchParams.get('start_y')).toBe('35.14332')
  expect(upstream.searchParams.get('route_mode')).toBe('BROAD_FIRST')
  expect(options?.headers).toEqual({ Authorization: 'KakaoAK private-test-key' })
  expect(result).toMatchObject({
    provider: 'KAKAO',
    distanceMeters: 1200,
    durationSeconds: 900,
    path: [
      { latitude: 35.14332, longitude: 126.80079 },
      { latitude: 35.146, longitude: 126.805 },
      { latitude: 35.15, longitude: 126.81 },
    ],
    steps: [{ instruction: '횡단보도까지 이동', distanceMeters: 1200 }],
  })
  expect(JSON.stringify(result)).not.toContain('private-test-key')
  expect(result).not.toHaveProperty('averageRiskScore')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})

it('키가 없으면 외부 요청 없이 설정 필요 상태를 반환한다', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', '')
  const response = await GET(new Request(url))
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ code: 'WALKING_NOT_CONFIGURED' })
  expect(fetch).not.toHaveBeenCalled()
})

it.each(['', '?startLat=abc', '?startLat=91&startLng=126&endLat=35&endLng=127'])(
  '잘못된 좌표를 거부한다: %s',
  async (query) => {
    const response = await GET(new Request('https://savedog.vercel.app/api/walking-route' + query))
    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  },
)

it.each([401, 403, 429, 500])('카카오 HTTP %s 응답에서 키를 노출하지 않는다', async (status) => {
  vi.mocked(fetch).mockResolvedValue(new Response('private-test-key', { status }))
  const response = await GET(new Request(url))
  expect(response.status).toBe(status === 429 ? 429 : status === 500 ? 502 : 503)
  expect(await response.text()).not.toContain('private-test-key')
})

it.each(['SAME_POINT', 'START_LINK_NOT_FOUND', 'END_LINK_NOT_FOUND', 'ROUTE_RESULT_NOT_FOUND'])(
  '카카오 경로 실패 %s를 안내한다',
  async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status })))
    const response = await GET(new Request(url))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ code: status })
  },
)

it('잘못된 경로 응답을 직선 경로로 대신하지 않는다', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'OK', route: {} })))
  expect((await GET(new Request(url))).status).toBe(502)
})

it('상위 API 시간 초과를 처리한다', async () => {
  vi.mocked(fetch).mockRejectedValue(new DOMException('Timeout', 'TimeoutError'))
  expect((await GET(new Request(url))).status).toBe(502)
})
