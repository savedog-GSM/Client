import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LocationPage from './LocationPage'
import { settings } from '../../test/fixtures'

let receive: PositionCallback
let fail: PositionErrorCallback
const clearWatch = vi.fn()
beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
  vi.stubGlobal('navigator', {
    geolocation: {
      watchPosition: vi.fn((success, error) => {
        receive = success
        fail = error
        return 42
      }),
      clearWatch,
    },
  })
  clearWatch.mockClear()
})
afterEach(() => vi.unstubAllGlobals())
function location(accuracy: number, speed: number | null = null): GeolocationPosition {
  return {
    coords: {
      latitude: 37.5,
      longitude: 127,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed,
    },
    timestamp: Date.now(),
  } as GeolocationPosition
}
it('명시적으로 시작한 뒤 정확한 위치만 전송하고 중지 시 구독을 해제한다', async () => {
  render(<LocationPage settings={settings} />)
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: '위치 전송 시작' }))
  act(() => receive(location(40)))
  expect(fetch).not.toHaveBeenCalled()
  await act(async () => receive(location(12)))
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  const options = vi.mocked(fetch).mock.calls[0][1]!
  expect(JSON.parse(options.body as string)).toEqual({
    latitude: 37.5,
    longitude: 127,
    accuracy: 12,
  })
  expect(new Headers(options.headers).get('X-Device-Token')).toBe('device-test')
  await userEvent.click(screen.getByRole('button', { name: '전송 중지' }))
  expect(clearWatch).toHaveBeenCalledWith(42)
})
it('위치 권한 거부 시 전송을 종료하고 이유를 표시한다', async () => {
  render(<LocationPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '위치 전송 시작' }))
  act(() =>
    fail({ code: 1, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }),
  )
  expect(screen.getByRole('alert').textContent).toContain('위치 권한이 거부')
  expect(clearWatch).toHaveBeenCalledWith(42)
})
it('보안 연결이 아닌 화면에서는 위치를 요청하지 않는다', async () => {
  vi.stubGlobal('isSecureContext', false)
  render(<LocationPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '위치 전송 시작' }))
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('HTTPS')
})
it('전송 중 화면을 나가면 위치 추적을 정리한다', async () => {
  const view = render(<LocationPage settings={settings} />)
  await userEvent.click(screen.getByRole('button', { name: '위치 전송 시작' }))
  view.unmount()
  expect(clearWatch).toHaveBeenCalledWith(42)
})
