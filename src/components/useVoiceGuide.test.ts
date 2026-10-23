import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useVoiceGuide } from './useVoiceGuide'

const koreanVoice = { lang: 'ko-KR', name: '한국어' }
const synthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  synthesis.getVoices.mockReturnValue([{ lang: 'en-US' }, koreanVoice])
  vi.stubGlobal('speechSynthesis', synthesis)
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(public text: string) {}
      lang = ''
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

it('버튼 입력 전에는 재생하지 않고 요청한 문구를 한국어로 읽는다', () => {
  const view = renderHook(useVoiceGuide)
  expect(synthesis.speak).not.toHaveBeenCalled()
  act(() => view.result.current.speak('화장실'))
  expect(synthesis.speak).toHaveBeenCalledWith(
    expect.objectContaining({ text: '화장실', lang: 'ko-KR', voice: koreanVoice }),
  )
})

it('다시 선택하면 이전 음성을 취소하고 최신 시설 이름만 읽는다', () => {
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('화장실'))
  const previous = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance
  act(() => view.result.current.speak('편의점'))
  expect(synthesis.cancel).toHaveBeenCalledOnce()
  expect(synthesis.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: '편의점' }))
  act(() => previous.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent))
  expect(view.result.current.error).toBe('')
})

it('화면 종료 후 늦게 발생한 음성 오류는 무시한다', () => {
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('화장실'))
  const utterance = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance
  view.unmount()
  expect(synthesis.cancel).toHaveBeenCalledOnce()
  act(() => utterance.onerror?.({} as SpeechSynthesisErrorEvent))
})

it('음성이 끝났으면 화면 종료 시 다른 음성을 취소하지 않는다', () => {
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('화장실'))
  const utterance = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance
  act(() => utterance.onend?.({} as SpeechSynthesisEvent))
  view.unmount()
  expect(synthesis.cancel).not.toHaveBeenCalled()
})

it('한국어 음성이 아직 로드되지 않아도 한국어 설정으로 재생한다', () => {
  synthesis.getVoices.mockReturnValue([])
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('편의점'))
  expect(synthesis.speak).toHaveBeenCalledWith(expect.objectContaining({ lang: 'ko-KR' }))
})

it('지원하지 않는 브라우저에서는 예외 대신 안내를 표시한다', () => {
  vi.stubGlobal('speechSynthesis', undefined)
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('편의점'))
  expect(view.result.current.error).toContain('음성 안내를 지원하지 않습니다')
})

it('재생 오류를 표시하고 다음 입력에서 다시 시도한다', () => {
  const view = renderHook(useVoiceGuide)
  act(() => view.result.current.speak('화장실'))
  const utterance = synthesis.speak.mock.calls[0][0] as SpeechSynthesisUtterance
  act(() => utterance.onerror?.({} as SpeechSynthesisErrorEvent))
  expect(view.result.current.error).toContain('음성 안내를 재생할 수 없습니다')
  act(() => view.result.current.speak('편의점'))
  expect(view.result.current.error).toBe('')
})
