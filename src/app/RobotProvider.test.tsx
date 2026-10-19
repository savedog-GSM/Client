import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { StreamHandlers } from '../api/realtime'
import { RobotProvider, useRobot } from './RobotProvider'
import { report, settings, status, telemetry } from '../test/fixtures'

const stream = vi.hoisted(() => ({ handlers: null as StreamHandlers | null, stop: vi.fn() }))
vi.mock('../api/realtime', () => ({
  connectStream: (_settings: unknown, handlers: StreamHandlers) => {
    stream.handlers = handlers
    return stream.stop
  },
}))
function Status() {
  const robot = useRobot()
  return (
    <>
      <output data-testid="robot">{JSON.stringify(robot.status)}</output>
      <output data-testid="reports">{JSON.stringify(robot.reports)}</output>
      <output data-testid="alerts">{robot.alerts.length}</output>
    </>
  )
}
beforeEach(() => {
  stream.handlers = null
  stream.stop.mockClear()
})
afterEach(() => vi.unstubAllGlobals())
it('늦게 도착한 초기 조회가 새 실시간 센서 값을 덮어쓰지 않는다', async () => {
  let resolveStatus: (value: Response) => void = () => {}
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.endsWith('/status')
        ? new Promise<Response>((resolve) => {
            resolveStatus = resolve
          })
        : Promise.resolve(new Response('[]')),
    ),
  )
  render(
    <RobotProvider settings={settings}>
      <Status />
    </RobotProvider>,
  )
  act(() => stream.handlers!.telemetry(telemetry))
  await act(async () =>
    resolveStatus(
      new Response(
        JSON.stringify({ ...status, sensor: { distance: 100, roll: null, pitch: null } }),
      ),
    ),
  )
  await waitFor(() =>
    expect(JSON.parse(screen.getByTestId('robot').textContent!)).toMatchObject({
      connected: true,
      sensor: telemetry.sensor,
    }),
  )
})
it('늦은 조회 중 수신한 연결 끊김과 신고 상태를 보존한다', async () => {
  const resolvers: ((value: Response) => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve))),
  )
  const view = render(
    <RobotProvider settings={settings}>
      <Status />
    </RobotProvider>,
  )
  act(() => {
    stream.handlers!.status({ connected: false, occurredAt: telemetry.recordedAt })
    stream.handlers!.report({ ...report, status: 'DISMISSED' })
  })
  await act(async () => {
    resolvers[0](new Response(JSON.stringify(status)))
    resolvers[1](new Response(JSON.stringify([report])))
  })
  await waitFor(() =>
    expect(JSON.parse(screen.getByTestId('reports').textContent!)[0].status).toBe('DISMISSED'),
  )
  expect(JSON.parse(screen.getByTestId('robot').textContent!).connected).toBe(false)
  view.unmount()
  expect(stream.stop).toHaveBeenCalledOnce()
})
it('같은 위험 알림을 중복 추가하지 않는다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(url.endsWith('/status') ? status : []))),
    ),
  )
  render(
    <RobotProvider settings={settings}>
      <Status />
    </RobotProvider>,
  )
  await waitFor(() => expect(screen.getByTestId('robot').textContent).toContain('true'))
  act(() => {
    const alert = { message: '위험', robotStopped: false, telemetry }
    stream.handlers!.alert(alert)
    stream.handlers!.alert(alert)
  })
  expect(screen.getByTestId('alerts').textContent).toBe('1')
})
