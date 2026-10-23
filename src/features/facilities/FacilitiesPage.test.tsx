import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import FacilitiesPage from './FacilitiesPage'
import { demoFacilityRoute } from './demo'
import { settings } from '../../test/fixtures'

const getPosition = vi.fn()
vi.mock('../map/SafetyMap', () => ({ default: () => <div>선택한 경로 지도</div> }))
beforeEach(() => {
  getPosition.mockReset()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal(
    'navigator',
    Object.create(navigator, { geolocation: { value: { getCurrentPosition: getPosition } } }),
  )
})
afterEach(() => vi.unstubAllGlobals())

it('명시적으로 시설을 선택하기 전에는 위치 권한이나 API를 요청하지 않는다', () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  render(<FacilitiesPage settings={settings} />)
  expect(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '가장 가까운 편의점 경로 찾기' })).toBeTruthy()
  expect(getPosition).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('실제 모드에서 현재 위치로 경로를 요청하고 결과 제목으로 포커스를 이동한다', async () => {
  getPosition.mockImplementation((success: PositionCallback) =>
    success({ coords: { latitude: 35.1, longitude: 126.8, accuracy: 10 } } as GeolocationPosition),
  )
  const data = demoFacilityRoute('TOILET')
  data.facility.name = '응답으로 받은 화장실'
  const fetch = vi.fn(async () => new Response(JSON.stringify(data)))
  vi.stubGlobal('fetch', fetch)
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  const heading = await screen.findByRole('heading', { name: '응답으로 받은 화장실' })
  expect(document.activeElement).toBe(heading)
  expect(fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: JSON.stringify({
        category: 'TOILET',
        origin: { latitude: 35.1, longitude: 126.8, accuracy: 10 },
      }),
    }),
  )
  expect(screen.getByText('약 110m')).toBeTruthy()
})

it('위치 권한이 거부되면 서버에 요청하지 않고 이유를 안내한다', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  getPosition.mockImplementation((_success: PositionCallback, failure: PositionErrorCallback) =>
    failure({ code: 1 } as GeolocationPositionError),
  )
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  expect((await screen.findByRole('alert')).textContent).toContain('위치 권한이 꺼져 있습니다')
  expect(fetch).not.toHaveBeenCalled()
})

it('미구현 서버는 준비 중으로 알리고 예시 결과로 대신하지 않는다', async () => {
  getPosition.mockImplementation((success: PositionCallback) =>
    success({ coords: { latitude: 35.1, longitude: 126.8, accuracy: 10 } } as GeolocationPosition),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Not found', { status: 404 })),
  )
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 편의점 경로 찾기' }))
  expect((await screen.findByRole('alert')).textContent).toContain('아직 준비되지 않았습니다')
  expect(screen.queryByText('시연용 편의점')).toBeNull()
})

it('취소한 위치 조회의 늦은 응답은 검색 요청을 발생시키지 않는다', async () => {
  let finish: PositionCallback = () => {}
  getPosition.mockImplementation((success: PositionCallback) => {
    finish = success
  })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  await userEvent.click(screen.getByRole('button', { name: '검색 취소' }))
  await act(async () =>
    finish({ coords: { latitude: 35.1, longitude: 126.8, accuracy: 10 } } as GeolocationPosition),
  )
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.getByRole('status', { name: '검색 상태' }).textContent).toContain(
    '검색을 취소했습니다',
  )
})

it('시연 모드는 실제 위치와 네트워크 없이 두 시설의 예시 경로를 제공한다', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  render(<FacilitiesPage settings={settings} simulated />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  expect(await screen.findByRole('heading', { name: '시연용 화장실' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 편의점 경로 찾기' }))
  expect(await screen.findByRole('heading', { name: '시연용 편의점' })).toBeTruthy()
  expect(screen.getByText('실제 시설이나 보행 경로가 아닌 시연용 예시입니다.')).toBeTruthy()
  expect(getPosition).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('위치 오차가 100m를 넘으면 경로 요청을 보내지 않는다', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  getPosition.mockImplementation((success: PositionCallback) =>
    success({
      coords: { latitude: 35.1, longitude: 126.8, accuracy: 2000 },
    } as GeolocationPosition),
  )
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  expect((await screen.findByRole('alert')).textContent).toContain('현재 위치의 오차가 큽니다')
  expect(fetch).not.toHaveBeenCalled()
})

it('이전 시설 검색이 늦게 끝나도 마지막으로 선택한 시설 결과를 유지한다', async () => {
  getPosition.mockImplementation((success: PositionCallback) =>
    success({ coords: { latitude: 35.1, longitude: 126.8, accuracy: 10 } } as GeolocationPosition),
  )
  let finish: (value: Response) => void = () => {}
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(demoFacilityRoute('CONVENIENCE_STORE')))),
  )
  render(<FacilitiesPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 화장실 경로 찾기' }))
  await userEvent.click(screen.getByRole('button', { name: '가장 가까운 편의점 경로 찾기' }))
  expect(await screen.findByRole('heading', { name: '시연용 편의점' })).toBeTruthy()
  await act(async () => finish(new Response(JSON.stringify(demoFacilityRoute('TOILET')))))
  expect(screen.queryByRole('heading', { name: '시연용 화장실' })).toBeNull()
  expect(screen.getByRole('heading', { name: '시연용 편의점' })).toBeTruthy()
})
