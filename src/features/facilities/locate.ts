import type { FacilityOrigin } from './types'

export function locate(): Promise<FacilityOrigin> {
  if (!window.isSecureContext)
    return Promise.reject(new Error('위치 확인을 위해 HTTPS 주소로 접속해주세요.'))
  if (!navigator.geolocation)
    return Promise.reject(new Error('이 브라우저에서는 현재 위치를 확인할 수 없습니다.'))
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.accuracy) || coords.accuracy > 100) {
          reject(
            new Error(
              '현재 위치의 오차가 큽니다. 스마트폰에서 위치 정확도를 높인 뒤 다시 선택해주세요.',
            ),
          )
          return
        }
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        })
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? '위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치를 허용한 뒤 다시 선택해주세요.'
              : '현재 위치를 확인하지 못했습니다. 잠시 후 다시 선택해주세요.',
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    ),
  )
}
