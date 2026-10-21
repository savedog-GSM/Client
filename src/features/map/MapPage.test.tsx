import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Point } from '../../api/types'
import { ApiError } from '../../api/client'
import { status } from '../../test/fixtures'
import MapPage from './MapPage'
import { searchLocations } from './searchLocations'

vi.mock('./searchLocations', () => ({ searchLocations: vi.fn() }))

const robot = vi.hoisted(() => ({
  api: { segments: vi.fn(), records: vi.fn(), searchPath: vi.fn() },
  getCurrentPosition: vi.fn(),
}))
vi.mock('../../app/RobotProvider', () => ({
  useRobot: () => ({ api: robot.api, status, reports: [], history: [] }),
}))
vi.mock('./SafetyMap', () => ({
  default: ({
    onSelect,
    currentPosition,
  }: {
    onSelect: (point: Point) => void
    currentPosition: Point | null
  }) => (
    <>
      <output aria-label="지도 현재 위치">{JSON.stringify(currentPosition)}</output>
      <button onClick={() => onSelect({ latitude: 37.5, longitude: 127 })}>지도 출발점</button>
      <button onClick={() => onSelect({ latitude: 37.6, longitude: 127.1 })}>지도 도착점</button>
    </>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  robot.api.segments.mockResolvedValue([])
  robot.getCurrentPosition.mockReset()
  vi.mocked(searchLocations).mockReset()
  vi.stubGlobal(
    'navigator',
    Object.create(navigator, {
      geolocation: { value: { getCurrentPosition: robot.getCurrentPosition } },
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())
it('PC에서 오차가 큰 위치를 받으면 대략적인 위치임을 안내한다', async () => {
  robot.getCurrentPosition.mockImplementation((success: PositionCallback) => {
    success({
      coords: { latitude: 35.123, longitude: 126.456, accuracy: 2500 },
    } as GeolocationPosition)
  })
  render(<MapPage />)
  expect(await screen.findByText(/위치 오차 범위: 약 2,500m/)).toBeTruthy()
  expect(screen.getByText(/대략적인 위치입니다/)).toBeTruthy()
})
it('위치를 다시 확인하면 이전 현재 위치 출발점을 지우고 새 좌표를 받는다', async () => {
  let finish: PositionCallback = () => {}
  robot.getCurrentPosition
    .mockImplementationOnce((success: PositionCallback) => {
      success({ coords: { latitude: 35, longitude: 126, accuracy: 2000 } } as GeolocationPosition)
    })
    .mockImplementationOnce((success: PositionCallback) => {
      finish = success
    })
  render(<MapPage />)
  await userEvent.click(screen.getByRole('button', { name: '현재 위치에서 출발' }))
  expect((screen.getByLabelText('출발지 주소') as HTMLInputElement).value).toBe('현재 위치')
  await userEvent.click(screen.getByRole('button', { name: '현재 위치 다시 확인' }))
  expect((screen.getByLabelText('출발지 주소') as HTMLInputElement).value).toBe('')
  expect(
    (screen.getByRole('button', { name: '현재 위치에서 출발' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(screen.getByLabelText('지도 현재 위치').textContent).toBe('null')
  await act(async () => {
    finish({ coords: { latitude: 35.16, longitude: 126.9, accuracy: 20 } } as GeolocationPosition)
  })
  expect(screen.getByLabelText('지도 현재 위치').textContent).toBe(
    JSON.stringify({ latitude: 35.16, longitude: 126.9 }),
  )
  expect(screen.getByText(/위치 오차 범위: 약 20m/)).toBeTruthy()
  expect(screen.queryByText(/대략적인 위치입니다/)).toBeNull()
})
it('현재 위치를 출발지로, 검색한 주소를 도착지로 설정한다', async () => {
  robot.getCurrentPosition.mockImplementation((success: PositionCallback) => {
    success({ coords: { latitude: 35.123, longitude: 126.456 } } as GeolocationPosition)
  })
  vi.mocked(searchLocations).mockResolvedValue([
    { name: '광주역', address: '광주 북구 무등로 235', latitude: 35.165, longitude: 126.909 },
  ])
  robot.api.searchPath.mockResolvedValue({
    mode: 'SAFEST',
    path: [],
    distanceMeters: 100,
    averageRiskScore: 1,
    maxRiskLevel: 'SAFE',
  })
  render(<MapPage />)
  await userEvent.click(screen.getByRole('button', { name: '현재 위치에서 출발' }))
  await userEvent.type(screen.getByLabelText('도착지 주소'), '광주역')
  await userEvent.click(screen.getByRole('button', { name: '도착지 주소 검색' }))
  await userEvent.click(await screen.findByRole('button', { name: /광주역 광주 북구/ }))
  await userEvent.click(screen.getByRole('button', { name: '경로 찾기' }))
  expect(robot.api.searchPath).toHaveBeenCalledWith(
    { latitude: 35.123, longitude: 126.456 },
    { latitude: 35.165, longitude: 126.909 },
    'SAFEST',
  )
  await userEvent.type(screen.getByLabelText('도착지 주소'), ' 수정')
  expect((screen.getByRole('button', { name: '경로 찾기' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
})
it('검색한 출발지를 선택하면 다음 지도 선택은 도착지가 된다', async () => {
  vi.mocked(searchLocations).mockResolvedValue([
    { name: '출발 주소', address: '광주 광산구', latitude: 35.1, longitude: 126.8 },
  ])
  render(<MapPage />)
  await userEvent.type(screen.getByLabelText('출발지 주소'), '광주 광산구')
  await userEvent.click(screen.getByRole('button', { name: '출발지 주소 검색' }))
  await userEvent.click(await screen.findByRole('button', { name: '출발 주소 광주 광산구' }))
  await userEvent.click(screen.getByRole('button', { name: '지도 도착점' }))
  expect((screen.getByRole('button', { name: '경로 찾기' }) as HTMLButtonElement).disabled).toBe(
    false,
  )
})
it('현재 위치를 조회해 지도에 전달한다', async () => {
  robot.getCurrentPosition.mockImplementation((success: PositionCallback) => {
    success({ coords: { latitude: 35.123, longitude: 126.456 } } as GeolocationPosition)
  })
  render(<MapPage />)
  expect(await screen.findByText('현재 위치를 기준으로 지도를 표시합니다.')).toBeTruthy()
  expect(screen.getByLabelText('지도 현재 위치').textContent).toBe(
    JSON.stringify({ latitude: 35.123, longitude: 126.456 }),
  )
  expect(robot.getCurrentPosition).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
  )
})
it('위치 권한을 거부하면 안내하고 지도 선택 기능은 유지한다', async () => {
  robot.getCurrentPosition.mockImplementation(
    (_: PositionCallback, failure: PositionErrorCallback) => {
      failure({ code: 1 } as GeolocationPositionError)
    },
  )
  render(<MapPage />)
  expect(await screen.findByText(/위치 권한이 거부되었습니다/)).toBeTruthy()
  expect(screen.getByLabelText('지도 현재 위치').textContent).toBe('null')
  await userEvent.click(screen.getByRole('button', { name: '지도 출발점' }))
  expect(screen.getByText('37.50000, 127.00000')).toBeTruthy()
})
it('위치 조회가 지연되면 실패 안내를 표시한다', async () => {
  robot.getCurrentPosition.mockImplementation(
    (_: PositionCallback, failure: PositionErrorCallback) => {
      failure({ code: 3 } as GeolocationPositionError)
    },
  )
  render(<MapPage />)
  expect(
    await screen.findByText('현재 위치를 확인하지 못했습니다. 기본 위치로 표시합니다.'),
  ).toBeTruthy()
})
it('출발과 도착을 선택한 후 서버의 안전 경로를 요청한다', async () => {
  robot.api.searchPath.mockResolvedValue({
    mode: 'SAFEST',
    path: [],
    distanceMeters: 123.4,
    averageRiskScore: 1.5,
    maxRiskLevel: 'SAFE',
  })
  render(<MapPage />)
  const search = screen.getByRole('button', { name: '경로 찾기' }) as HTMLButtonElement
  expect(search.disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: '지도 출발점' }))
  await userEvent.click(screen.getByRole('button', { name: '지도 도착점' }))
  await userEvent.click(search)
  await waitFor(() =>
    expect(robot.api.searchPath).toHaveBeenCalledWith(
      { latitude: 37.5, longitude: 127 },
      { latitude: 37.6, longitude: 127.1 },
      'SAFEST',
    ),
  )
  expect(await screen.findByText('123.4 m')).toBeTruthy()
  await userEvent.click(screen.getByRole('combobox', { name: '탐색 방식' }))
  await userEvent.click(screen.getByRole('option', { name: /최단 거리/ }))
  expect(screen.queryByText('123.4 m')).toBeNull()
})
it('수집된 길이 없어 경로를 못 찾으면 서버의 안내를 표시한다', async () => {
  robot.api.searchPath.mockRejectedValue(
    new ApiError(404, 'PATH_NOT_FOUND', '경로를 찾지 못했습니다.'),
  )
  render(<MapPage />)
  await userEvent.click(screen.getByRole('button', { name: '지도 출발점' }))
  await userEvent.click(screen.getByRole('button', { name: '지도 도착점' }))
  await userEvent.click(screen.getByRole('button', { name: '경로 찾기' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '경로를 찾지 못했습니다.')
})
