import { afterEach, expect, it, vi } from 'vitest'
import { createFacilitiesApi } from './api'
import { demoFacilityRoute } from './demo'
import { settings } from '../../test/fixtures'
import { demoPosition } from '../demo/session'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const origin = { ...demoPosition, accuracy: 10 }
const signal = () => new AbortController().signal

it('시설 종류와 현재 위치를 새 API로 전송하고 장치 토큰을 보내지 않는다', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(demoFacilityRoute('TOILET'))))
  vi.stubGlobal('fetch', fetch)
  const route = await createFacilitiesApi(settings).nearestRoute('TOILET', origin, signal())
  expect(route.facility.category).toBe('TOILET')
  expect(fetch).toHaveBeenCalledWith(
    '/api/facilities/nearest-route',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ category: 'TOILET', origin }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.operatorToken}`,
      },
    }),
  )
})

it.each([404, 501])('미구현 응답 %i를 준비 중 상태로 처리한다', async (status) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Not implemented', { status })),
  )
  await expect(
    createFacilitiesApi(settings).nearestRoute('TOILET', origin, signal()),
  ).rejects.toMatchObject({ code: 'FEATURE_NOT_READY' })
})

it('시설 없음 응답은 미구현 응답과 구분한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(JSON.stringify({ code: 'FACILITY_NOT_FOUND' }), { status: 404 }),
    ),
  )
  await expect(
    createFacilitiesApi(settings).nearestRoute('TOILET', origin, signal()),
  ).rejects.toMatchObject({ code: 'FACILITY_NOT_FOUND' })
})

it('다른 시설 종류나 불완전한 보행 경로는 표시하지 않는다', async () => {
  const data = demoFacilityRoute('TOILET')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(data))),
  )
  await expect(
    createFacilitiesApi(settings).nearestRoute('CONVENIENCE_STORE', origin, signal()),
  ).rejects.toMatchObject({ code: 'INVALID_ROUTE' })
  data.route.path = []
  await expect(
    createFacilitiesApi(settings).nearestRoute('TOILET', origin, signal()),
  ).rejects.toMatchObject({ code: 'INVALID_ROUTE' })
})

it('15초 제한을 넘기면 요청을 중단하고 타이머를 정리한다', async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    ),
  )
  const pending = createFacilitiesApi(settings).nearestRoute('TOILET', origin, signal())
  const result = expect(pending).rejects.toThrow('검색 시간이 초과되었습니다.')
  await vi.advanceTimersByTimeAsync(15000)
  await result
  expect(vi.getTimerCount()).toBe(0)
})
