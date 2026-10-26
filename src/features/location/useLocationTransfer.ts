import { useEffect, useMemo, useState } from 'react'
import { createApi, errorMessage, type Api } from '../../api/client'
import type { ConnectionSettings, LocationInput } from '../../api/types'
import { demoPosition } from '../demo/session'
import { useVoiceGuide } from '../../components/useVoiceGuide'
import { useScreenWakeLock } from './useScreenWakeLock'

export function useLocationTransfer(
  settings: ConnectionSettings,
  apiOverride: Api | undefined,
  simulated: boolean,
) {
  const api = useMemo(() => apiOverride ?? createApi(settings), [settings, apiOverride])
  const voice = useVoiceGuide()
  const [running, setRunning] = useState(false)
  const [location, setLocation] = useState<LocationInput | null>(null)
  const [sentAt, setSentAt] = useState('')
  const [error, setError] = useState('')
  const [wakeMessage, setWakeMessage] = useState(
    '화면 꺼짐 방지를 지원하지 않으면 화면을 직접 켜두세요.',
  )
  const [message, setMessage] = useState(
    simulated
      ? '전송 시작 버튼을 눌러 예시 GPS를 확인하세요.'
      : '전송 시작 버튼을 눌러 위치 접근을 허용해주세요.',
  )
  useScreenWakeLock(running && !simulated, setWakeMessage)
  useEffect(() => {
    if (!running) return
    let active = true
    let sending = false
    let queued: LocationInput | null = null
    async function send(value: LocationInput) {
      queued = value
      if (sending) return
      sending = true
      while (active && queued) {
        const next = queued
        queued = null
        try {
          await api.location(next)
          if (active) {
            setSentAt(new Date().toLocaleTimeString('ko-KR'))
            setError('')
            setMessage(
              simulated
                ? '예시 위치를 시연 데이터에 반영하고 있습니다. 서버 전송은 없습니다.'
                : '위치를 서버에 전송하고 있습니다.',
            )
          }
        } catch (error) {
          if (active) setError(errorMessage(error))
        }
      }
      sending = false
    }
    if (simulated) {
      const update = () => {
        const value = { ...demoPosition, accuracy: 3 }
        setLocation(value)
        void send(value)
      }
      update()
      const timer = window.setInterval(update, 2000)
      return () => {
        active = false
        window.clearInterval(timer)
      }
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!active) return
        const value = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          ...(coords.speed !== null && coords.speed >= 0 ? { speed: coords.speed } : {}),
        }
        setLocation(value)
        if (coords.accuracy > 30) {
          setMessage('위치 오차가 30m를 넘어 전송을 기다립니다. 야외에서 다시 확인해주세요.')
          return
        }
        void send(value)
      },
      (error) => {
        if (!active) return
        setError(
          error.code === 1
            ? '위치 권한이 거부되었습니다. 브라우저 설정에서 위치를 허용해주세요.'
            : error.code === 2
              ? '현재 위치를 찾을 수 없습니다.'
              : '위치 확인 시간이 초과되었습니다. 다시 시도하고 있습니다.',
        )
        if (error.code === 1) setRunning(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
    return () => {
      active = false
      navigator.geolocation.clearWatch(watchId)
    }
  }, [api, running, simulated])
  function start() {
    setError('')
    if (simulated) {
      voice.speak('위치 전송을 시작하겠습니다')
      setRunning(true)
      return
    }
    if (!window.isSecureContext) {
      setError('위치 전송 화면은 HTTPS 또는 localhost에서 열어주세요.')
      return
    }
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 기능을 지원하지 않습니다.')
      return
    }
    if (window.location.protocol === 'https:' && settings.apiUrl.startsWith('http:')) {
      setError(
        'HTTPS 화면에서는 서버도 HTTPS 주소로 연결해주세요. 연결 설정에서 변경할 수 있습니다.',
      )
      return
    }
    voice.speak('위치 전송을 시작하겠습니다')
    setRunning(true)
  }
  function stop() {
    voice.stop()
    setRunning(false)
    setMessage('위치 전송을 중지했습니다.')
    setWakeMessage('화면 꺼짐 방지 꺼짐')
  }
  return {
    running,
    location,
    sentAt,
    error,
    wakeMessage,
    message,
    start,
    stop,
    voiceError: voice.error,
  }
}
