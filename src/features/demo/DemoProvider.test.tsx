import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RobotProvider, useRobot } from '../../app/RobotProvider'
import { settings } from '../../test/fixtures'
import LocationPage from '../location/LocationPage'

const connect = vi.hoisted(() => vi.fn(() => vi.fn()))
vi.mock('../../api/realtime', () => ({ connectStream: connect }))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function Phone() {
  const { api } = useRobot()
  return <LocationPage settings={settings} apiOverride={api} simulated />
}

it('시연 위치 전송에 GPS 권한과 실제 API·실시간 연결을 사용하지 않고 종료 시 타이머를 정리한다', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn()
  const watch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  vi.stubGlobal('navigator', { geolocation: { watchPosition: watch } })
  const view = render(
    <RobotProvider settings={settings} demo>
      <Phone />
    </RobotProvider>,
  )
  await act(async () => screen.getByRole('button', { name: '위치 전송 시작' }).click())
  expect(screen.getByText(/예시 위치를 시연 데이터에 반영/)).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
  expect(watch).not.toHaveBeenCalled()
  expect(connect).not.toHaveBeenCalled()
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

function Mode() {
  return <output>{useRobot().demo ? '시연' : '실제'}</output>
}

it('실제 모드로 전환한 후에만 서버 연결을 시작하고 이전 시연 타이머를 종료한다', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(async () => new Response('[]'))
  vi.stubGlobal('fetch', fetch)
  const view = render(
    <RobotProvider settings={settings} demo>
      <Mode />
    </RobotProvider>,
  )
  expect(screen.getByText('시연')).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
  await act(async () =>
    view.rerender(
      <RobotProvider settings={settings}>
        <Mode />
      </RobotProvider>,
    ),
  )
  expect(screen.getByText('실제')).toBeTruthy()
  expect(connect).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(vi.getTimerCount()).toBe(1)
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
