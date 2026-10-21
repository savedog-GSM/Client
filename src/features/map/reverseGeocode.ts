import type { Point } from '../../api/types'
import { loadKakaoMaps } from './kakao'

export async function reverseGeocode(point: Point): Promise<string | null> {
  const { services } = await loadKakaoMaps()
  return new Promise((resolve, reject) => {
    new services.Geocoder().coord2Address(point.longitude, point.latitude, (results, status) => {
      if (status === services.Status.ZERO_RESULT) return resolve(null)
      if (status !== services.Status.OK) return reject(new Error('주소 조회에 실패했습니다.'))
      const result = results[0]
      resolve(result?.road_address?.address_name || result?.address?.address_name || null)
    })
  })
}
