import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import RecentAlerts from './RecentAlerts'

const robot = vi.hoisted(() => ({
  alerts: [],
  stream: 'connected',
  streamError: '',
  now: 10000,
  lastTelemetryReceivedAt: null as number | null,
}))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => robot }))
beforeEach(() => {
  robot.stream = 'connected'
  robot.streamError = ''
  robot.lastTelemetryReceivedAt = null
})
const show = () =>
  render(
    <MemoryRouter>
      <RecentAlerts />
    </MemoryRouter>,
  )

it('소켓 연결과 센서 수신 대기를 구분해 표시한다', () => {
  show()
  expect(screen.getByRole('status').textContent).toContain('센서 수신 대기')
})
it('서버 시각 대신 브라우저의 센서 수신 시각으로 연결 상태를 표시한다', () => {
  robot.lastTelemetryReceivedAt = 9900
  show()
  expect(screen.getByRole('status').textContent).toContain('센서 수신 중')
})
it('연결 오류를 빈 알림 목록과 함께 표시한다', () => {
  robot.stream = 'error'
  robot.streamError = '관제 토큰을 확인해주세요.'
  show()
  expect(screen.getByRole('status').textContent).toContain('관제 토큰')
})
