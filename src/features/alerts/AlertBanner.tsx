import { useEffect, useRef, useState } from 'react'
import { useRobot } from '../../app/RobotProvider'

export default function AlertBanner() {
  const { alerts, status } = useRobot()
  const [dismissedId, setDismissedId] = useState<number | null>(null)
  const [sound, setSound] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const lastPlayed = useRef<number | null>(null)
  const alert = alerts[0]
  useEffect(() => {
    if (!sound || !alert || lastPlayed.current === alert.telemetry.id || !audio.current) return
    lastPlayed.current = alert.telemetry.id
    const context = audio.current
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = alert.robotStopped ? 660 : 880
    gain.gain.setValueAtTime(0.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.6)
  }, [alert, sound])
  useEffect(
    () => () => {
      void audio.current?.close()
    },
    [],
  )
  async function toggleSound() {
    if (sound) {
      setSound(false)
      return
    }
    try {
      audio.current ??= new AudioContext()
      await audio.current.resume()
      setSound(true)
    } catch {
      setSound(false)
    }
  }
  const showAlert = alert && alert.telemetry.id !== dismissedId
  return (
    <>
      <div className="sound-bar">
        <span>위험 알림은 접속 이후 수신한 내역입니다.</span>
        <button onClick={() => void toggleSound()} aria-pressed={sound}>
          {sound ? '알림 소리 끄기' : '알림 소리 켜기'}
        </button>
      </div>
      {showAlert ? (
        <div className={`alarm ${alert.robotStopped ? '' : 'urgent'}`} role="alert">
          <div>
            <strong>
              {alert.robotStopped
                ? '위험 감지 · 자동 대응 명령 전송'
                : '긴급 · 자동 정지 명령을 보내지 못했습니다'}
            </strong>
            <p>{alert.message}</p>
          </div>
          <button onClick={() => setDismissedId(alert.telemetry.id)}>확인</button>
        </div>
      ) : (
        status.risk?.level === 'DANGER' && (
          <div className="alarm" role="alert">
            <strong>현재 위험 상태 · {status.risk.reason ?? '주변 상황을 확인해주세요.'}</strong>
          </div>
        )
      )}
    </>
  )
}
