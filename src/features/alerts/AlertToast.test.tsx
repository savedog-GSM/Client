import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DangerAlert, RobotStatus } from '../../api/types'
import { status, telemetry } from '../../test/fixtures'
import AlertToast from './AlertToast'

const robot = vi.hoisted(() => ({ alerts: [] as DangerAlert[], status: {} as RobotStatus }))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => robot }))

function alert(id: number, level: 'CAUTION' | 'DANGER' = 'DANGER'): DangerAlert {
  return {
    message: `알림 ${id}`,
    robotStopped: level === 'DANGER',
    telemetry: {
      ...telemetry,
      id,
      risk: { ...telemetry.risk, level },
      recordedAt: new Date().toISOString(),
    },
  }
}
beforeEach(() => {
  vi.useFakeTimers()
  robot.status = { ...status }
  robot.alerts = [alert(1)]
})
afterEach(() => vi.useRealTimers())

it('알림은 3초 뒤 사라지고 센서가 계속 갱신되어도 다시 뜨지 않는다', () => {
  const view = render(<AlertToast />)
  act(() => vi.advanceTimersByTime(2999))
  expect(screen.getByRole('alert').textContent).toContain('알림 1')
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByRole('alert')).toBeNull()
  robot.status = { ...robot.status, lastSeenAt: new Date().toISOString() }
  view.rerender(<AlertToast />)
  expect(screen.queryByRole('alert')).toBeNull()
})

it('안전으로 바꾸면 즉시 닫고 기존 알림 기록은 유지한다', () => {
  const view = render(<AlertToast />)
  robot.status = { ...robot.status, risk: { level: 'SAFE', score: 1, reason: null } }
  view.rerender(<AlertToast />)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(robot.alerts).toHaveLength(1)
  expect(vi.getTimerCount()).toBe(0)
})

it('새 알림은 이전 타이머에 닫히지 않고 새로 3초 동안 표시한다', () => {
  const view = render(<AlertToast />)
  act(() => vi.advanceTimersByTime(2000))
  robot.alerts = [alert(2), ...robot.alerts]
  view.rerender(<AlertToast />)
  act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByRole('alert').textContent).toContain('알림 2')
  act(() => vi.advanceTimersByTime(2000))
  expect(screen.queryByRole('alert')).toBeNull()
})

it('주의 상태에서는 이전 긴급 알림을 숨기고 주의 문구로 표시한다', () => {
  const view = render(<AlertToast />)
  robot.status = { ...robot.status, risk: { level: 'CAUTION', score: 3, reason: '장애물 주의' } }
  view.rerender(<AlertToast />)
  expect(screen.queryByRole('alert')).toBeNull()
  robot.alerts = [alert(2, 'CAUTION'), ...robot.alerts]
  view.rerender(<AlertToast />)
  expect(screen.getByRole('alert').textContent).toContain('주의')
  expect(screen.getByRole('alert').textContent).not.toContain('실패')
  expect(screen.getByRole('alert').textContent).not.toContain('보내지 못했습니다')
})

it('위험 상태만 수신한 경우에도 3초 뒤 닫고 사유 갱신으로 다시 띄우지 않는다', () => {
  robot.alerts = []
  const view = render(<AlertToast />)
  expect(screen.getByRole('alert').textContent).toContain('현재 위험 상태')
  act(() => vi.advanceTimersByTime(3000))
  robot.status = { ...robot.status, risk: { ...telemetry.risk, reason: '새 센서 사유' } }
  view.rerender(<AlertToast />)
  expect(screen.queryByRole('alert')).toBeNull()
})

it('닫은 알림과 오래된 수신 내역을 다시 띄우지 않고 종료 시 타이머를 정리한다', () => {
  const view = render(<AlertToast />)
  act(() => screen.getByRole('button', { name: '알림 닫기' }).click())
  expect(screen.queryByRole('alert')).toBeNull()
  robot.alerts = [alert(2)]
  view.rerender(<AlertToast />)
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
  act(() => vi.advanceTimersByTime(3001))
  render(<AlertToast />)
  expect(screen.queryByRole('alert')).toBeNull()
})
