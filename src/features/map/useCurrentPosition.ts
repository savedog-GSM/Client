import { useEffect, useState } from 'react'
import type { Point } from '../../api/types'
import { demoPosition } from '../demo/session'

export function useCurrentPosition(demo: boolean, onRefresh: (point: Point) => void) {
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null)
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(true)
  const [locationRevision, setLocationRevision] = useState(0)
  const [locationMessage, setLocationMessage] = useState('현재 위치를 확인하고 있습니다.')
  useEffect(() => {
    if (demo) {
      setCurrentPosition(demoPosition)
      setPositionAccuracy(3)
      setLocating(false)
      setLocationMessage(
        '시연용 위치를 표시합니다. 경로는 실제 보행 안내에 사용할 수 없는 예시입니다.',
      )
      return
    }
    setCurrentPosition(null)
    setPositionAccuracy(null)
    setLocating(true)
    setLocationMessage('현재 위치를 확인하고 있습니다.')
    if (!navigator.geolocation) {
      setLocationMessage('현재 위치를 지원하지 않는 브라우저입니다. 기본 위치로 표시합니다.')
      setLocating(false)
      return
    }
    let active = true
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!active) return
        const point = { latitude: coords.latitude, longitude: coords.longitude }
        setCurrentPosition(point)
        setPositionAccuracy(Number.isFinite(coords.accuracy) ? coords.accuracy : null)
        setLocating(false)
        if (locationRevision > 0) onRefresh(point)
        setLocationMessage('현재 위치를 기준으로 지도를 표시합니다.')
      },
      (error) => {
        if (!active) return
        setLocating(false)
        setLocationMessage(
          error.code === 1
            ? '위치 권한이 거부되었습니다. 기본 위치로 표시합니다. 브라우저 설정에서 위치를 허용해주세요.'
            : '현재 위치를 확인하지 못했습니다. 기본 위치로 표시합니다.',
        )
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    )
    return () => {
      active = false
    }
  }, [locationRevision, demo, onRefresh])
  return {
    currentPosition,
    positionAccuracy,
    locating,
    locationMessage,
    refreshPosition: () => setLocationRevision((value) => value + 1),
  }
}
