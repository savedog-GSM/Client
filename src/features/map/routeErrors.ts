import { ApiError, errorMessage } from '../../api/client'

export function routeErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'PATH_NOT_FOUND') {
    return '선택한 출발지와 도착지를 잇는 수집 경로가 없습니다. 두 지점이 수집된 길에서 30m 이내인지 확인해주세요. 안전 우선에서는 위험 구간이 제외됩니다.'
  }
  if (error instanceof ApiError && error.status === 404) {
    return '서버에서 경로 탐색 API를 찾지 못했습니다. 서버 주소와 /api/paths/search 배포 상태를 확인해주세요.'
  }
  return errorMessage(error)
}
