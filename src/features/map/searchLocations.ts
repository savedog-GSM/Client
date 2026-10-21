import type { Point } from '../../api/types'
import { loadKakaoMaps } from './kakao'

export interface LocationResult extends Point {
  name: string
  address: string
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  const maps = await loadKakaoMaps()
  const { Geocoder, Places, Status } = maps.services
  const addresses = new Promise<LocationResult[]>((resolve, reject) => {
    new Geocoder().addressSearch(query, (items, status) => {
      if (status === Status.ERROR)
        return reject(new Error('주소 검색에 실패했습니다. 다시 시도해주세요.'))
      resolve(
        items.map((item) => ({
          name: item.address_name,
          address: item.road_address?.address_name || item.address_name,
          latitude: Number(item.y),
          longitude: Number(item.x),
        })),
      )
    })
  })
  const places = new Promise<LocationResult[]>((resolve, reject) => {
    new Places().keywordSearch(
      query,
      (items, status) => {
        if (status === Status.ERROR)
          return reject(new Error('장소 검색에 실패했습니다. 다시 시도해주세요.'))
        resolve(
          items.map((item) => ({
            name: item.place_name,
            address: item.road_address_name || item.address_name,
            latitude: Number(item.y),
            longitude: Number(item.x),
          })),
        )
      },
      { size: 5 },
    )
  })
  const responses = await Promise.allSettled([addresses, places])
  const results = responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value : [],
  )
  if (!results.length) {
    const failed = responses.find((response) => response.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
  }
  return results
    .filter(
      (result, index) =>
        results.findIndex(
          (other) =>
            other.name === result.name &&
            other.latitude === result.latitude &&
            other.longitude === result.longitude,
        ) === index,
    )
    .slice(0, 10)
}
