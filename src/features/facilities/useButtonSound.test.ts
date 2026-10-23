import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useButtonSound } from './useButtonSound'

const audio = {
  construct: vi.fn(),
  resume: vi.fn(),
  close: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  audio.resume.mockResolvedValue(undefined)
  audio.close.mockResolvedValue(undefined)
  audio.createOscillator.mockImplementation(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: audio.start,
    stop: audio.stop,
  }))
  audio.createGain.mockImplementation(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }))
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        audio.construct()
      }
      state = 'running'
      currentTime = 1
      destination = {}
      resume = audio.resume
      close = audio.close
      createOscillator = audio.createOscillator
      createGain = audio.createGain
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

it('자동 재생 없이 버튼 입력 때만 짧은 확인음을 재생한다', async () => {
  const view = renderHook(useButtonSound)
  expect(audio.construct).not.toHaveBeenCalled()
  await act(async () => view.result.current.play())
  expect(audio.construct).toHaveBeenCalledTimes(1)
  expect(audio.start).toHaveBeenCalledTimes(1)
  expect(audio.stop).toHaveBeenCalledWith(1.13)
  view.unmount()
  expect(audio.close).toHaveBeenCalledTimes(1)
})

it('설정 조작 없이 버튼을 누를 때마다 확인음을 재생한다', async () => {
  const view = renderHook(useButtonSound)
  await act(async () => view.result.current.play())
  await act(async () => view.result.current.play())
  expect(audio.construct).toHaveBeenCalledTimes(1)
  expect(audio.start).toHaveBeenCalledTimes(2)
})

it('화면을 나간 뒤 늦게 시작된 오디오는 재생하지 않는다', async () => {
  let resume: () => void = () => {}
  audio.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resume = resolve
      }),
  )
  const view = renderHook(useButtonSound)
  let playback: Promise<void>
  act(() => {
    playback = view.result.current.play()
  })
  view.unmount()
  await act(async () => {
    resume()
    await playback
  })
  expect(audio.start).not.toHaveBeenCalled()
  expect(audio.close).toHaveBeenCalledTimes(1)
})

it('재생을 거부한 브라우저에서는 오류를 던지지 않고 안내한다', async () => {
  audio.resume.mockRejectedValue(new Error('Not allowed'))
  const view = renderHook(useButtonSound)
  await act(async () => view.result.current.play())
  expect(view.result.current.error).toContain('버튼 소리를 재생할 수 없습니다')
  expect(audio.start).not.toHaveBeenCalled()
})
