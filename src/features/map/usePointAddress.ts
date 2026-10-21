import { useEffect, useState } from 'react'
import type { Point } from '../../api/types'
import { reverseGeocode } from './reverseGeocode'

export interface AddressPoint extends Point {
  address?: string
}

export function usePointAddress(point: AddressPoint | null) {
  const [result, setResult] = useState<{ point: Point; address: string } | null>(null)
  useEffect(() => {
    if (!point || point.address) return
    let active = true
    reverseGeocode(point)
      .then((address) => {
        if (active) setResult({ point, address: address || '주소 정보가 없는 위치입니다.' })
      })
      .catch(() => {
        if (active) setResult({ point, address: '주소를 불러오지 못했습니다.' })
      })
    return () => {
      active = false
    }
  }, [point])
  if (!point) return ''
  if (point.address) return point.address
  return result?.point === point ? result.address : '주소 확인 중…'
}
