import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRobot } from '../../app/RobotProvider'
import type { RiskLevel } from '../../api/types'
import { alertTitle } from './alertTitle'
import './alert-toast.css'

interface Toast {
  key: string
  title: string
  message: string
  level: RiskLevel
}

export default function AlertToast() {
  const { alerts, status } = useRobot()
  const [toast, setToast] = useState<Toast | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [sound, setSound] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const lastPlayed = useRef<string | null>(null)
  const lastAlertId = useRef<number | null>(null)
  const previousLevel = useRef<RiskLevel | undefined>(undefined)
  const alert = alerts[0]
  const level = status.risk?.level
  const reason = status.risk?.reason
  useEffect(() => {
    const changed = previousLevel.current !== level
    previousLevel.current = level
    if (level === 'SAFE') {
      setLeaving(true)
      return
    }
    if (alert) {
      if (level && level !== alert.telemetry.risk.level) {
        setLeaving(true)
        return
      }
      if (lastAlertId.current === alert.telemetry.id) return
      lastAlertId.current = alert.telemetry.id
      if (Date.now() - Date.parse(alert.telemetry.recordedAt) >= 3000) return
      setLeaving(false)
      setToast({
        key: `alert-${alert.telemetry.id}`,
        title: alertTitle(alert),
        message: alert.message,
        level: alert.telemetry.risk.level,
      })
    } else if (level === 'DANGER' && changed) {
      setLeaving(false)
      setToast({
        key: `status-${Date.now()}`,
        title: '현재 위험 상태',
        message: reason ?? '주변 상황을 확인해주세요.',
        level,
      })
    }
  }, [alert, level, reason])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(
      () => (leaving ? setToast(null) : setLeaving(true)),
      leaving ? 280 : 2720,
    )
    return () => window.clearTimeout(timer)
  }, [toast, leaving])
  useEffect(() => {
    if (
      !sound ||
      !toast ||
      leaving ||
      level === 'SAFE' ||
      lastPlayed.current === toast.key ||
      !audio.current
    )
      return
    lastPlayed.current = toast.key
    const context = audio.current
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = toast.level === 'DANGER' ? 880 : 660
    gain.gain.setValueAtTime(0.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.6)
  }, [toast, sound, leaving, level])
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
  const closing = leaving || level === 'SAFE' || (level && toast && level !== toast.level)
  return (
    <>
      <div className="sound-bar">
        <span>위험 알림은 접속 이후 수신한 내역입니다.</span>
        <button onClick={() => void toggleSound()} aria-pressed={sound}>
          {sound ? '알림 소리 끄기' : '알림 소리 켜기'}
        </button>
      </div>
      {toast &&
        createPortal(
          <div
            key={toast.key}
            className={`alert-toast ${toast.level.toLowerCase()} ${closing ? 'leaving' : ''}`}
            role={closing ? undefined : 'alert'}
            aria-hidden={closing ? true : undefined}
            aria-atomic="true"
          >
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="알림 닫기"
              tabIndex={closing ? -1 : undefined}
              onClick={() => setLeaving(true)}
            >
              ×
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
