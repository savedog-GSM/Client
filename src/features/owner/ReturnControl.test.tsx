import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ReturnControl from './ReturnControl'

afterEach(() => vi.unstubAllGlobals())

it('스마트폰 현재 위치로 돌아가기를 시작한다', async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({ coords: { latitude: 35.143, longitude: 126.8, accuracy: 6 } } as GeolocationPosition),
  )
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const api = {
    startOwnerReturn: vi.fn().mockResolvedValue({}),
    stopOwnerReturn: vi.fn(),
  }
  const onChange = vi.fn()
  render(<ReturnControl api={api as never} state={null} disabled={false} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '현재 위치로 돌아오기 시작' }))
  await waitFor(() =>
    expect(api.startOwnerReturn).toHaveBeenCalledWith({
      latitude: 35.143,
      longitude: 126.8,
      accuracy: 6,
    }),
  )
  expect(onChange).toHaveBeenCalledOnce()
})
