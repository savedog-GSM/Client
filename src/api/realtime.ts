import { Client } from '@stomp/stompjs'
import type { ConnectionSettings, DangerAlert, Report, Telemetry } from './types'

export type StreamState = 'connecting' | 'connected' | 'disconnected' | 'error'
export interface StreamHandlers {
  state: (state: StreamState, message?: string) => void
  ready: () => void
  telemetry: (value: Telemetry) => void
  status: (value: { connected: boolean; occurredAt: string }) => void
  report: (value: Report) => void
  alert: (value: DangerAlert) => void
}
export function connectStream(settings: ConnectionSettings, handlers: StreamHandlers) {
  const url = new URL(import.meta.env.VITE_WS_URL || `${settings.apiUrl.replace(/\/$/, '')}/ws`)
  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:'
  const client = new Client({
    brokerURL: url.href,
    connectHeaders: settings.operatorToken
      ? { Authorization: `Bearer ${settings.operatorToken}` }
      : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectionTimeout: 10000,
    onConnect: () => {
      const subscribe = <T>(topic: string, receive: (value: T) => void) =>
        client.subscribe(topic, (message) => {
          try {
            receive(JSON.parse(message.body) as T)
          } catch {
            handlers.state(
              'error',
              '실시간 데이터 형식을 읽지 못했습니다. 서버 응답을 확인해주세요.',
            )
          }
        })
      subscribe('/topic/robot/telemetry', handlers.telemetry)
      subscribe('/topic/robot/status', handlers.status)
      subscribe('/topic/reports', handlers.report)
      subscribe('/topic/alerts', handlers.alert)
      handlers.state('connected')
      handlers.ready()
    },
    onWebSocketClose: () => handlers.state('disconnected'),
    onWebSocketError: () =>
      handlers.state(
        'error',
        '실시간 서버에 연결할 수 없습니다. 서버 주소·네트워크·허용 출처를 확인해주세요.',
      ),
    onStompError: () =>
      handlers.state(
        'error',
        '실시간 인증 또는 구독이 거부되었습니다. 연결 설정의 관제 토큰을 확인해주세요.',
      ),
  })
  handlers.state('connecting')
  client.activate()
  return () => {
    void client.deactivate()
  }
}
