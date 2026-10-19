import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Point } from '../../api/types'
import { ApiError } from '../../api/client'
import { status } from '../../test/fixtures'
import MapPage from './MapPage'

const robot = vi.hoisted(() => ({
  api: { segments: vi.fn(), records: vi.fn(), searchPath: vi.fn() },
}))
vi.mock('../../app/RobotProvider', () => ({
  useRobot: () => ({ api: robot.api, status, reports: [], history: [] }),
}))
vi.mock('./SafetyMap', () => ({
  default: ({ onSelect }: { onSelect: (point: Point) => void }) => (
    <>
      <button onClick={() => onSelect({ latitude: 37.5, longitude: 127 })}>지도 출발점</button>
      <button onClick={() => onSelect({ latitude: 37.6, longitude: 127.1 })}>지도 도착점</button>
    </>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  robot.api.segments.mockResolvedValue([])
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
  await userEvent.selectOptions(screen.getByLabelText('탐색 방식'), 'SHORTEST')
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
