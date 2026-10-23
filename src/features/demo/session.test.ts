import { afterEach, expect, it, vi } from 'vitest'
import { createDemoSession, demoPosition } from './session'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('시연 API는 조회·제어·신고·위치 전송 중 네트워크를 사용하지 않는다', async () => {
  const fetch = vi.fn(() => {
    throw new Error('실제 요청 금지')
  })
  vi.stubGlobal('fetch', fetch)
  const session = createDemoSession()
  const api = session.api
  expect((await api.status()).connected).toBe(true)
  expect(await api.telemetry()).toHaveLength(60)
  expect(await api.segments()).not.toHaveLength(0)
  expect(await api.records({ swLat: 35, swLng: 126, neLat: 36, neLng: 127 })).toHaveLength(1)
  const path = await api.searchPath(
    demoPosition,
    { latitude: 35.145, longitude: 126.803 },
    'SAFEST',
  )
  expect(path.path[0]).toEqual(demoPosition)
  expect(path.distanceMeters).toBeGreaterThan(0)
  await api.command({ type: 'FORWARD', speed: 30, durationMs: 1000 })
  await api.location(demoPosition)
  await api.submit(1, 'DEMO-001')
  expect((await api.report(1)).status).toBe('SUBMITTED')
  await api.dismiss(1)
  expect((await api.reports())[0].status).toBe('DISMISSED')
  expect((await api.photo(1)).url).toMatch(/^\/demo\//)
  expect((await api.frame()).url).toMatch(/^\/demo\//)
  expect(fetch).not.toHaveBeenCalled()
})

it('위험 상황은 자동 정지와 신고를 생성하고 이동 명령도 정지 상태로 유지한다', async () => {
  const session = createDemoSession()
  await session.api.command({ type: 'FORWARD', speed: 50 })
  session.setRisk('DANGER')
  expect(session.getSnapshot().status).toMatchObject({ speed: 0, risk: { level: 'DANGER' } })
  expect(session.getSnapshot().alerts[0].robotStopped).toBe(true)
  expect(session.getSnapshot().reports).toHaveLength(2)
  await session.api.command({ type: 'FORWARD', speed: 50 })
  expect(session.getSnapshot().status.speed).toBe(0)
  session.setRisk('SAFE')
  expect(session.getSnapshot().status.risk.level).toBe('SAFE')
})

it('시연 이동은 지정 시간이 끝나면 멈추고 새 세션에 남지 않는다', async () => {
  vi.useFakeTimers()
  const session = createDemoSession()
  await session.api.command({ type: 'FORWARD', speed: 50, durationMs: 1000 })
  expect(session.getSnapshot().status.speed).toBe(0.5)
  vi.advanceTimersByTime(1001)
  session.tick()
  expect(session.getSnapshot().status.speed).toBe(0)
  expect(createDemoSession().getSnapshot().lastCommand).toBe('')
})
