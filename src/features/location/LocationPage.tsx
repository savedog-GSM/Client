import { useEffect, useMemo, useRef, useState } from 'react'
import { createApi, errorMessage } from '../../api/client'
import type { ConnectionSettings, LocationInput } from '../../api/types'
import { ErrorNotice, number, PageTitle } from '../../components/ui'

export default function LocationPage({ settings }: { settings: ConnectionSettings }) {
  const api = useMemo(() => createApi(settings), [settings])
  const [running, setRunning] = useState(false)
  const [location, setLocation] = useState<LocationInput | null>(null)
  const [sentAt, setSentAt] = useState('')
  const [error, setError] = useState('')
  const [wakeMessage, setWakeMessage] = useState('화면 꺼짐 방지를 지원하지 않으면 화면을 직접 켜두세요.')
  const [message, setMessage] = useState('전송 시작 버튼을 눌러 위치 접근을 허용해주세요.')
  const generation = useRef(0)
  useEffect(() => {
    if (!running) return
    const current = ++generation.current
    let active = true
    let sending = false
    let queued: LocationInput | null = null
    let wakeLock: WakeLockSentinel | null = null
    async function send(value: LocationInput) {
      queued = value
      if (sending) return
      sending = true
      while (active && queued) {
        const next = queued
        queued = null
        try {
          await api.location(next)
          if (active && generation.current === current) { setSentAt(new Date().toLocaleTimeString('ko-KR')); setError(''); setMessage('위치를 서버에 전송하고 있습니다.') }
        } catch (error) { if (active) setError(errorMessage(error)) }
      }
      sending = false
    }
    const watchId = navigator.geolocation.watchPosition(({ coords }) => {
      if (!active) return
      const value = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
        ...(coords.speed !== null && coords.speed >= 0 ? { speed: coords.speed } : {}) }
      setLocation(value)
      if (coords.accuracy > 30) { setMessage('위치 오차가 30m를 넘어 전송을 기다립니다. 야외에서 다시 확인해주세요.'); return }
      void send(value)
    }, (error) => {
      if (!active) return
      setError(error.code === 1 ? '위치 권한이 거부되었습니다. 브라우저 설정에서 위치를 허용해주세요.' : error.code === 2 ? '현재 위치를 찾을 수 없습니다.' : '위치 확인 시간이 초과되었습니다. 다시 시도하고 있습니다.')
      if (error.code === 1) setRunning(false)
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
    async function keepAwake() {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (!active) { await lock.release(); return }
        wakeLock = lock
        setWakeMessage('화면 꺼짐 방지 켜짐')
        lock.addEventListener('release', () => { if (active) setWakeMessage('화면 꺼짐 방지가 해제되었습니다. 화면을 켜두세요.') })
      } catch { if (active) setWakeMessage('화면 꺼짐 방지를 켤 수 없습니다. 화면을 직접 켜두세요.') }
    }
    void keepAwake()
    const visibility = () => { if (document.visibilityState === 'visible') void keepAwake() }
    document.addEventListener('visibilitychange', visibility)
    return () => { active = false; generation.current++; navigator.geolocation.clearWatch(watchId); void wakeLock?.release(); document.removeEventListener('visibilitychange', visibility) }
  }, [api, running])
  function start() {
    setError('')
    if (!window.isSecureContext) { setError('위치 전송 화면은 HTTPS 또는 localhost에서 열어주세요.'); return }
    if (!navigator.geolocation) { setError('이 브라우저는 위치 기능을 지원하지 않습니다.'); return }
    if (window.location.protocol === 'https:' && settings.apiUrl.startsWith('http:')) { setError('HTTPS 화면에서는 서버도 HTTPS 주소로 연결해주세요. 연결 설정에서 변경할 수 있습니다.'); return }
    setRunning(true)
  }
  return <div className="location-page"><PageTitle title="스마트폰 위치 전송" description="로보독에 올려둔 스마트폰에서 이 화면을 열어주세요." />
    <ErrorNotice message={error} /><section className="panel location-card"><span className={`location-indicator ${running ? 'active' : ''}`}>◎</span><h2>{running ? '위치 전송 중' : '전송 대기'}</h2><p role="status">{message}</p><dl className="details"><div><dt>위도</dt><dd>{location?.latitude.toFixed(6) ?? '값 없음'}</dd></div><div><dt>경도</dt><dd>{location?.longitude.toFixed(6) ?? '값 없음'}</dd></div><div><dt>위치 오차</dt><dd>{number(location?.accuracy, ' m')}</dd></div><div><dt>마지막 전송 성공</dt><dd>{sentAt || '전송 기록 없음'}</dd></div></dl>
    <button className={running ? 'stop-button' : 'primary'} onClick={() => { if (running) { setRunning(false); setMessage('위치 전송을 중지했습니다.'); setWakeMessage('화면 꺼짐 방지 꺼짐') } else start() }}>{running ? '전송 중지' : '위치 전송 시작'}</button><p className="muted">{wakeMessage}</p></section><p className="muted">화면을 켜두고 이 페이지를 유지해주세요. 위치 오차 30m 이내의 값만 전송합니다. 위치 전송만으로 이동 기록이 생성되지는 않습니다.</p>
  </div>
}
