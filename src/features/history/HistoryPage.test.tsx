import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import HistoryPage from './HistoryPage'
import { telemetry } from '../../test/fixtures'

const api = vi.hoisted(() => ({ telemetry: vi.fn() }))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => ({ api }) }))
beforeEach(() => vi.clearAllMocks())

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
  render(<HistoryPage />)
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
  render(<HistoryPage />)
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
