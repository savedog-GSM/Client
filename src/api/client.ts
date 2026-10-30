import type {
  Command,
  ConnectionSettings,
  LocationInput,
  PathMode,
  PathResult,
  Point,
  Report,
  RobotStatus,
  SafetyRecord,
  Segment,
  Telemetry,
  VisionResult,
} from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export function createApi(settings: ConnectionSettings) {
  const base = settings.apiUrl.replace(/\/$/, '')
  async function request<T>(path: string, options: RequestInit = {}, device = false): Promise<T> {
    const headers = new Headers(options.headers)
    if (options.body) headers.set('Content-Type', 'application/json')
    if (device && settings.deviceToken) headers.set('X-Device-Token', settings.deviceToken)
    if (!device && settings.operatorToken)
      headers.set('Authorization', `Bearer ${settings.operatorToken}`)
    let response: Response
    try {
      response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        cache: 'no-store',
        signal: options.signal ?? AbortSignal.timeout(15000),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        '서버에 연결할 수 없습니다. 서버 주소와 네트워크를 확인해주세요.',
      )
    }
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new ApiError(
        response.status,
        error?.code ?? 'HTTP_ERROR',
        response.status === 401
          ? device
            ? '장치 인증에 실패했습니다. 연결 설정에서 서버의 DEVICE_API_TOKEN과 같은 장치 토큰을 입력해주세요.'
            : '관제 인증에 실패했습니다. 연결 설정에서 서버의 OPERATOR_API_TOKEN과 같은 관제 토큰을 입력해주세요. 새로고침하면 다시 입력해야 합니다.'
          : (error?.message ?? `요청에 실패했습니다. (${response.status})`),
      )
    }
    if (response.status === 204) return undefined as T
    return response.json()
  }
  const post = <T>(path: string, body?: unknown, device = false) =>
    request<T>(
      path,
      { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) },
      device,
    )
  return {
    status: (signal?: AbortSignal) => request<RobotStatus>('/api/robot/status', { signal }),
    telemetry: (from = '', to = '', signal?: AbortSignal) => {
      const query = new URLSearchParams()
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      return request<Telemetry[]>(`/api/robot/telemetry?${query}`, { signal })
    },
    segments: (signal?: AbortSignal) => request<Segment[]>('/api/safety/segments', { signal }),
    records: (
      bounds: { swLat: number; swLng: number; neLat: number; neLng: number },
      signal?: AbortSignal,
    ) =>
      request<SafetyRecord[]>(
        `/api/safety/records?${new URLSearchParams(Object.entries(bounds).map(([key, value]) => [key, String(value)]))}`,
        { signal },
      ),
    searchPath: (start: Point, end: Point, mode: PathMode, signal?: AbortSignal) =>
      request<PathResult>('/api/paths/search', {
        method: 'POST',
        body: JSON.stringify({ start, end, mode }),
        signal,
      }),
    command: (command: Command) =>
      post<{ commandId: number; type: string; sentAt: string }>('/api/robot/commands', command),
    reports: (signal?: AbortSignal) => request<Report[]>('/api/reports', { signal }),
    report: (id: number) => request<Report>(`/api/reports/${id}`),
    submit: (id: number, receiptNumber: string) =>
      post<Report>(`/api/reports/${id}/submit`, { receiptNumber }),
    dismiss: (id: number) => post<Report>(`/api/reports/${id}/dismiss`),
    photo: (id: number) => request<{ url: string }>(`/api/reports/${id}/photo/url`),
    frame: (signal?: AbortSignal) =>
      request<{ url: string }>('/api/robot/frames/latest/url', { signal }),
    vision: (signal?: AbortSignal) => request<VisionResult>('/api/robot/vision', { signal }),
    location: (location: LocationInput) => post<void>('/api/robot/location', location, true),
  }
}
export type Api = ReturnType<typeof createApi>
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}
