import { afterEach, expect, it, vi } from 'vitest'
import { POST } from './nearest-route'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('가장 가까운 편의점을 카카오에서 찾고 도보 경로를 반환한다', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        documents: [
          {
            id: 'store-1',
            place_name: '가까운 편의점',
            address_name: '광주광역시 광산구',
            road_address_name: '광주광역시 광산구 송정로 1',
            x: '126.801',
            y: '35.144',
          },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        status: 'OK',
        route: {
          properties: { totalDistance: 120, totalTime: 90 },
          legs: [
            {
              steps: [
                {
                  properties: { guidance: '직진', distance: 120 },
                  path: {
                    points: [
                      [126.8, 35.143],
                      [126.801, 35.144],
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
    )
  vi.stubGlobal('fetch', fetch)

  const response = await POST(
    new Request('https://savedog.vercel.app/api/facilities/nearest-route', {
      method: 'POST',
      body: JSON.stringify({
        category: 'CONVENIENCE_STORE',
        origin: { latitude: 35.143, longitude: 126.8, accuracy: 5 },
      }),
    }),
  )
  const result = await response.json()

  expect(response.status).toBe(200)
  expect(result.facility.name).toBe('가까운 편의점')
  expect(result.route.distanceMeters).toBe(120)
  expect(fetch.mock.calls[0][0]).toContain('category_group_code=CS2')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('KakaoAK test-key')
})

it('화장실은 현재 위치 주변 키워드로 검색한다', async () => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-key')
  const fetch = vi.fn().mockResolvedValue(Response.json({ documents: [] }))
  vi.stubGlobal('fetch', fetch)
  const response = await POST(
    new Request('https://savedog.vercel.app/api/facilities/nearest-route', {
      method: 'POST',
      body: JSON.stringify({
        category: 'TOILET',
        origin: { latitude: 35.143, longitude: 126.8, accuracy: 5 },
      }),
    }),
  )
  expect(response.status).toBe(404)
  expect(fetch.mock.calls[0][0]).toContain('query=%ED%99%94%EC%9E%A5%EC%8B%A4')
})
