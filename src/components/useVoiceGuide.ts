import { useCallback, useEffect, useRef, useState } from 'react'

export function useVoiceGuide() {
  const [error, setError] = useState('')
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    if (!current.current) return
    current.current = null
    window.speechSynthesis?.cancel()
  }, [])

  useEffect(() => stop, [stop])

  function speak(text: string) {
    try {
      stop()
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setError(
          '이 브라우저에서는 음성 안내를 지원하지 않습니다. 버튼 기능은 계속 이용할 수 있습니다.',
        )
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      const voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('ko'))
      if (voice) utterance.voice = voice
      utterance.onend = () => {
        if (current.current === utterance) current.current = null
      }
      utterance.onerror = () => {
        if (current.current !== utterance) return
        current.current = null
        setError('음성 안내를 재생할 수 없습니다. 버튼 기능은 계속 이용할 수 있습니다.')
      }
      current.current = utterance
      setError('')
      window.speechSynthesis.speak(utterance)
    } catch {
      current.current = null
      setError('음성 안내를 재생할 수 없습니다. 버튼 기능은 계속 이용할 수 있습니다.')
    }
  }

  return { error, speak, stop }
}
