import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import type { DangerAlert, Segment, Telemetry } from '../../api/types'
import { status, telemetry } from '../../test/fixtures'
import DashboardPage from './DashboardPage'

const robot = vi.hoisted(() => ({
  api: { telemetry: vi.fn() },
  status: {} as typeof status,
  now: 0,
  stream: 'connected',
  statusError: '',
  retry: vi.fn(),
  history: [] as Telemetry[],
  reports: [],
  alerts: [] as DangerAlert[],
}))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => robot }))
vi.mock('../map/SafetyMap', () => ({
  default: ({ segments }: { segments: Segment[] }) => (
    <output aria-label="지도 이동 구간">{segments.length}</output>
  ),
}))
vi.mock('./RobotControls', () => ({ default: () => <button>로봇 제어</button> }))
vi.mock('./CameraPanel', () => ({ default: () => <button>카메라 보기</button> }))
beforeEach(() => {
  vi.clearAllMocks()
  robot.now = Date.now()
  robot.stream = 'connected'
  robot.statusError = ''
  robot.status = {
    ...status,
    lastSeenAt: new Date(robot.now).toISOString(),
    lastLocationAt: new Date(robot.now).toISOString(),
  }
  robot.history = []
  robot.alerts = []
  robot.api.telemetry.mockReset().mockResolvedValue([])
})
const showDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )

it('오래된 센서 값을 현재의 안전 상태로 표시하지 않는다', async () => {
  robot.status = {
    ...robot.status,
    lastSeenAt: new Date(robot.now - 10000).toISOString(),
    risk: { level: 'SAFE', score: 1, reason: null },
  }
  showDashboard()
  expect(screen.getByText('센서 수신 대기')).toBeTruthy()
  expect(screen.queryByText('안전한 상태예요')).toBeNull()
  expect(await screen.findByText('선택한 기간에 수신한 센서 데이터가 없습니다.')).toBeTruthy()
})
it('현재 위험 상태와 최근 알림을 구분하고 새로고침을 실행한다', async () => {
  robot.alerts = [{ message: '장애물을 확인해주세요.', robotStopped: true, telemetry }]
  showDashboard()
  expect(screen.getByText('주변 확인이 필요해요')).toBeTruthy()
  expect(screen.getByText('장애물을 확인해주세요.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: '새로고침' }))
  expect(robot.retry).toHaveBeenCalledTimes(1)
})
it('메인에는 지도가 아닌 카메라를 표시하고 제어 메뉴를 따로 펼친다', async () => {
  robot.history = [
    { ...telemetry, id: 1, recordedAt: new Date(robot.now - 1000).toISOString() },
    { ...telemetry, id: 2, latitude: 37.5666, recordedAt: new Date(robot.now).toISOString() },
  ]
  showDashboard()
  expect(screen.queryByLabelText('지도 이동 구간')).toBeNull()
  expect(screen.getAllByRole('button', { name: '카메라 보기' })).toHaveLength(1)
  expect(screen.getByRole('button', { name: '로봇 제어' }).closest('details')?.open).toBe(false)
  await userEvent.click(screen.getByText('로보독 제어 및 연결 정보'))
  expect(screen.getByRole('button', { name: '로봇 제어' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '카메라 보기' })).toBeTruthy()
})
it('조회 기간을 바꾸면 이전 응답을 무시하고 해당 기간의 기록을 그린다', async () => {
  let finish: (records: Telemetry[]) => void = () => {}
  robot.api.telemetry
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValueOnce([
      { ...telemetry, recordedAt: new Date(robot.now - 120000).toISOString() },
    ])
  showDashboard()
  const firstSignal = robot.api.telemetry.mock.calls[0][2] as AbortSignal
  await userEvent.click(screen.getByRole('button', { name: '5분' }))
  expect(firstSignal.aborted).toBe(true)
  expect(await screen.findByRole('img', { name: '최근 5분 위험도 추이, 1점에서 5점' })).toBeTruthy()
  await act(async () => {
    finish([])
  })
  expect(screen.getByRole('img', { name: '최근 5분 위험도 추이, 1점에서 5점' })).toBeTruthy()
})
it('기간 조회 실패를 표시하면서 실시간 기록은 유지한다', async () => {
  robot.api.telemetry.mockRejectedValue(new Error('기록 조회 실패'))
  robot.history = [{ ...telemetry, recordedAt: new Date(robot.now).toISOString() }]
  showDashboard()
  expect(await screen.findByText('기록 조회 실패')).toBeTruthy()
  await waitFor(() =>
    expect(screen.getByRole('img', { name: '최근 1분 위험도 추이, 1점에서 5점' })).toBeTruthy(),
  )
})
