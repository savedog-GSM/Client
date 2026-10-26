import { useEffect } from 'react'

export function useScreenWakeLock(enabled: boolean, setWakeMessage: (message: string) => void) {
  useEffect(() => {
    if (!enabled) return
    let active = true
    let wakeLock: WakeLockSentinel | null = null
    async function keepAwake() {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (!active) {
          await lock.release()
          return
        }
        wakeLock = lock
        setWakeMessage('화면 꺼짐 방지 켜짐')
        lock.addEventListener('release', () => {
          if (active) setWakeMessage('화면 꺼짐 방지가 해제되었습니다. 화면을 켜두세요.')
        })
      } catch {
        if (active) setWakeMessage('화면 꺼짐 방지를 켤 수 없습니다. 화면을 직접 켜두세요.')
      }
    }
    void keepAwake()
    const visibility = () => {
      if (document.visibilityState === 'visible') void keepAwake()
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      active = false
      void wakeLock?.release()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled, setWakeMessage])
}
