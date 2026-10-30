import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './client'
import { settings } from '../test/fixtures'

afterEach(() => vi.unstubAllGlobals())
describe('API 인증과 오류 처리', () => {
  it('인식 결과는 관제 인증과 취소 신호를 사용해 조회한다', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    await createApi(settings).vision(controller.signal)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/robot/vision')
    expect(options.headers.get('Authorization')).toBe('Bearer operator-test')
    expect(options.headers.has('X-Device-Token')).toBe(false)
    expect(options.signal).toBe(controller.signal)
  })
  it('관제 조회에는 Bearer 토큰만 보낸다', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    await createApi(settings).status()
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/robot/status')
    expect(options.headers.get('Authorization')).toBe('Bearer operator-test')
    expect(options.headers.has('X-Device-Token')).toBe(false)
    expect(options.cache).toBe('no-store')
  })
  it('위치 전송에는 장치 토큰만 보내고 204를 처리한다', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const point = { latitude: 37.5, longitude: 127, accuracy: 10 }
    await expect(createApi(settings).location(point)).resolves.toBeUndefined()
    const [, options] = fetch.mock.calls[0]
    expect(options.headers.get('X-Device-Token')).toBe('device-test')
    expect(options.headers.has('Authorization')).toBe(false)
    expect(JSON.parse(options.body)).toEqual(point)
  })
  it('카메라 프레임은 JPEG와 장치 토큰으로 전송한다', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' })
    await createApi(settings).sendFrame(jpeg)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8080/api/robot/frames')
    expect(options.headers.get('Content-Type')).toBe('image/jpeg')
    expect(options.headers.get('X-Device-Token')).toBe('device-test')
    expect(options.body).toBe(jpeg)
  })
  it('인증을 끈 서버에는 빈 토큰을 보내지 않는다', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    const api = createApi({ ...settings, operatorToken: '', deviceToken: '' })
    await api.status()
    await api.location({ latitude: 0, longitude: 0 })
    fetch.mock.calls.forEach(([, options]) => {
      expect(options.headers.has('Authorization')).toBe(false)
      expect(options.headers.has('X-Device-Token')).toBe(false)
    })
  })
  it.each([
    [401, 'UNAUTHORIZED'],
    [409, 'REPORT_ALREADY_PROCESSED'],
    [502, 'REPORT_SUBMIT_FAILED'],
    [503, 'IMAGE_STORAGE_UNAVAILABLE'],
  ])('HTTP %s 서버 오류를 보존한다', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code, message: '오류 안내' }), { status }),
        ),
    )
    await expect(createApi(settings).status()).rejects.toMatchObject({
      status,
      code,
      message: status === 401 ? expect.stringContaining('관제 인증에 실패') : '오류 안내',
    })
  })
  it('장치 인증 실패는 관제 토큰이 아닌 장치 토큰을 안내한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    await expect(
      createApi(settings).location({ latitude: 35.1, longitude: 126.8 }),
    ).rejects.toMatchObject({ message: expect.stringContaining('DEVICE_API_TOKEN') })
  })
  it('JSON이 아닌 서버 오류도 표시할 수 있다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })))
    await expect(createApi(settings).status()).rejects.toBeInstanceOf(ApiError)
  })
  it('네트워크 오류를 사용자 안내로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(createApi(settings).status()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
  it('기간 쿼리와 경로 요청 형식을 유지한다', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    const api = createApi(settings)
    await api.telemetry('2026-10-19T00:00', '2026-10-19T23:59')
    const query = new URL(fetch.mock.calls[0][0]).searchParams
    expect(query.get('from')).toBe('2026-10-19T00:00')
    const start = { latitude: 37.5, longitude: 127 }
    const end = { latitude: 37.6, longitude: 127.1 }
    await api.searchPath(start, end, 'SHORTEST')
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ start, end, mode: 'SHORTEST' })
  })
})
