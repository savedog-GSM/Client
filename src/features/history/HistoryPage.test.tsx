import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import HistoryPage from './HistoryPage'
import { telemetry, status } from '../../test/fixtures'
import { MemoryRouter } from 'react-router-dom'

const api = vi.hoisted(() => ({ telemetry: vi.fn(), status: vi.fn() }))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => ({ api }) }))
beforeEach(() => {
  vi.clearAllMocks()
  api.status.mockResolvedValue(status)
})
const show = () =>
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )

it('서버가 보낸 순서와 관계없이 최신 시각과 ID 순으로 표시한다', async () => {
  const records = [
    {
      ...telemetry,
      id: 1,
      recordedAt: '2026-10-27T10:00:00',
      sensor: { ...telemetry.sensor, distance: 10 },
    },
    {
      ...telemetry,
      id: 3,
      recordedAt: '2026-10-27T11:00:00',
      sensor: { ...telemetry.sensor, distance: 30 },
    },
    {
      ...telemetry,
      id: 2,
      recordedAt: '2026-10-27T11:00:00',
      sensor: { ...telemetry.sensor, distance: 20 },
    },
  ]
  api.telemetry.mockResolvedValue(records)
  show()
  await screen.findByRole('table')
  const rows = screen.getAllByRole('row').slice(1)
  expect(rows.map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
    '30 cm',
    '20 cm',
    '10 cm',
  ])
  expect(records.map((record) => record.id)).toEqual([1, 3, 2])
})

it('전체 결과를 정렬한 뒤 50건씩 나눠 표시한다', async () => {
  api.telemetry.mockResolvedValue(
    Array.from({ length: 51 }, (_, index) => ({
      ...telemetry,
      id: index + 1,
      recordedAt: new Date(Date.UTC(2026, 9, 27, 0, 0, index)).toISOString(),
    })),
  )
  show()
  await screen.findByRole('table')
  expect(screen.getAllByRole('row')).toHaveLength(51)
  expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0].textContent).toContain(
    '00:00:50',
  )
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(screen.getAllByRole('row')).toHaveLength(2)
  expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell')[0].textContent).toContain(
    '00:00:00',
  )
})

it('최신 위치를 조회해 표시하면서 과거의 누락 위치는 그대로 구분한다', async () => {
  api.status.mockResolvedValue({ ...status, latitude: 35.14332, longitude: 126.80079 })
  api.telemetry.mockResolvedValue([{ ...telemetry, latitude: null, longitude: null }])
  show()
  expect(await screen.findByText('35.143320')).toBeTruthy()
  expect(screen.getByText('126.800790')).toBeTruthy()
  const row = screen.getAllByRole('row')[1]
  expect(within(row).getAllByText('수신 당시 위치 없음')).toHaveLength(2)
  expect(api.status).toHaveBeenCalledWith(expect.any(AbortSignal))
})

it('위치 조회 실패가 정상 센서 기록을 숨기지 않으며 재조회할 수 있다', async () => {
  api.status
    .mockRejectedValueOnce(new Error('위치 조회 인증 실패'))
    .mockResolvedValue({ ...status, latitude: 35.1, longitude: 126.8 })
  api.telemetry.mockResolvedValue([telemetry])
  show()
  expect((await screen.findByRole('alert')).textContent).toContain('위치 조회 인증 실패')
  expect(await screen.findByRole('table')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: '위치 다시 불러오기' }))
  expect(await screen.findByText('35.100000')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(api.telemetry).toHaveBeenCalledOnce()
})

it('저장된 센서 좌표는 위도와 경도로 나눠 보여준다', async () => {
  api.telemetry.mockResolvedValue([telemetry])
  show()
  await screen.findByRole('table')
  const row = screen.getAllByRole('row')[1]
  expect(within(row).getByText('37.566500')).toBeTruthy()
  expect(within(row).getByText('126.978000')).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '위도' })).toBeTruthy()
  expect(screen.getByRole('columnheader', { name: '경도' })).toBeTruthy()
})

it('최신 GPS가 없으면 위치 전송 안내를 표시한다', async () => {
  api.telemetry.mockResolvedValue([])
  api.status.mockResolvedValue({ ...status, latitude: null, longitude: null, lastLocationAt: null })
  show()
  expect((await screen.findByRole('status')).textContent).toContain(
    '스마트폰 위치 전송과 센서 전송',
  )
  expect(screen.queryByRole('link', { name: /위치 전송 화면/ })).toBeNull()
})
