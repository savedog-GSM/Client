import { useEffect, useRef, useState } from 'react'

export function useButtonSound() {
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState('')
  const enabledRef = useRef(true)
  const mounted = useRef(false)
  const audio = useRef<AudioContext | null>(null)
  const playing = useRef<OscillatorNode | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      playing.current?.stop()
      playing.current = null
      void audio.current?.close().catch(() => {})
      audio.current = null
    }
  }, [])

  async function play() {
    if (!enabledRef.current) return
    try {
      if (!audio.current || audio.current.state === 'closed') audio.current = new AudioContext()
      const context = audio.current
      await context.resume()
      if (!mounted.current || !enabledRef.current || audio.current !== context) return
      playing.current?.stop()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      gain.gain.setValueAtTime(0.001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
        if (playing.current === oscillator) playing.current = null
      }
      playing.current = oscillator
      oscillator.start()
      oscillator.stop(context.currentTime + 0.13)
      setError('')
    } catch {
      if (mounted.current)
        setError('버튼 소리를 재생할 수 없습니다. 시설 검색은 계속 이용할 수 있습니다.')
    }
  }

  function toggle() {
    enabledRef.current = !enabledRef.current
    setEnabled(enabledRef.current)
    setError('')
    if (!enabledRef.current) {
      playing.current?.stop()
      playing.current = null
    }
  }

  return { enabled, error, play, toggle }
}
