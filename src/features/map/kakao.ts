let loading: Promise<typeof kakao.maps> | null = null

export function loadKakaoMaps() {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY
    if (!key) { reject(new Error('카카오 지도 키가 설정되지 않았습니다. VITE_KAKAO_MAP_APP_KEY를 설정해주세요.')); return }
    const script = document.createElement('script')
    const timer = setTimeout(() => { script.remove(); reject(new Error('지도를 불러오는 시간이 초과되었습니다. 네트워크와 카카오 도메인 등록을 확인해주세요.')) }, 15000)
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`
    script.onload = () => {
      if (!window.kakao?.maps) { clearTimeout(timer); script.remove(); reject(new Error('카카오 지도 키와 등록된 도메인을 확인해주세요.')); return }
      window.kakao.maps.load(() => { clearTimeout(timer); resolve(window.kakao.maps) })
    }
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('카카오 지도를 불러올 수 없습니다. 네트워크를 확인해주세요.')) }
    document.head.append(script)
  }).catch((error) => { loading = null; throw error })
  return loading
}
