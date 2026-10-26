import { expect, it, vi } from 'vitest'
import { connectStream, type StreamHandlers } from './realtime'
import { settings, telemetry } from '../test/fixtures'

const mock = vi.hoisted(() => ({
  options: null as Record<string, unknown> | null,
  subscribe: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
}))
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    constructor(options: Record<string, unknown>) {
      mock.options = options
    }
    activate = mock.activate
    deactivate = mock.deactivate
    subscribe = mock.subscribe
  },
}))
it('네 개의 명세 토픽을 구독하고 연결 종료 시 해제한다', () => {
  const handlers: StreamHandlers = {
    state: vi.fn(),
    ready: vi.fn(),
    telemetry: vi.fn(),
    status: vi.fn(),
    report: vi.fn(),
    alert: vi.fn(),
  }
  const stop = connectStream(settings, handlers)
  expect(mock.options?.brokerURL).toBe('ws://localhost:8080/ws')
  expect(mock.options?.connectHeaders).toEqual({ Authorization: 'Bearer operator-test' })
  ;(mock.options?.onConnect as () => void)()
  expect(mock.subscribe.mock.calls.map(([topic]) => topic)).toEqual([
    '/topic/robot/telemetry',
    '/topic/robot/status',
    '/topic/reports',
    '/topic/alerts',
  ])
  mock.subscribe.mock.calls[0][1]({ body: JSON.stringify(telemetry) })
  expect(handlers.telemetry).toHaveBeenCalledWith(telemetry)
  mock.subscribe.mock.calls[0][1]({ body: 'invalid' })
  expect(handlers.state).toHaveBeenCalledWith('error', expect.stringContaining('데이터 형식'))
  ;(mock.options?.onStompError as () => void)()
  expect(handlers.state).toHaveBeenCalledWith('error', expect.stringContaining('관제 토큰'))
  ;(mock.options?.onWebSocketClose as () => void)()
  expect(handlers.state).toHaveBeenLastCalledWith('disconnected')
  stop()
  expect(mock.deactivate).toHaveBeenCalled()
})
