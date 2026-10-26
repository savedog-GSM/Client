import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CameraPanel from './CameraPanel'
import type { VisionResult } from '../../api/types'

const robot = vi.hoisted(() => ({
  api: { frame: vi.fn(), vision: vi.fn() },
  now: 0,
  demo: false,
}))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => robot }))

const result: VisionResult = {
  available: true,
  fresh: true,
  frameReceivedAt: '2026-10-26T12:00:00',
  analyzedAt: '2026-10-26T12:00:00',
  elapsedMs: 80,
  score: 5,
  level: 'DANGER',
  reason: '카메라: 전방 자전거 (신뢰도 93%)',
  detections: [
    {
      label: 'bicycle',
      name: '자전거',
      confidence: 0.93,
      left: 0.3,
      top: 0.2,
      right: 0.8,
      bottom: 0.9,
    },
  ],
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  robot.now = Date.now()
  robot.demo = false
  robot.api.frame.mockResolvedValue({ url: '/frame.jpg' })
  robot.api.vision.mockResolvedValue(result)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function openCamera() {
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '카메라 보기' })))
}

it('카메라를 켰을 때만 프레임과 관제 인식 결과를 함께 조회한다', async () => {
  render(<CameraPanel />)
  expect(robot.api.vision).not.toHaveBeenCalled()
  await openCamera()
  expect(robot.api.frame).toHaveBeenCalledOnce()
  expect(robot.api.vision).toHaveBeenCalledOnce()
  expect(screen.getByText('자전거')).toBeTruthy()
  expect(screen.getByText('신뢰도 93%')).toBeTruthy()
  expect(screen.getByText('80ms')).toBeTruthy()
  expect(screen.getByText('위험 · 5점')).toBeTruthy()
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  expect(robot.api.vision).toHaveBeenCalledTimes(2)
})

it('메인 대시보드에서는 버튼을 누르지 않아도 조회를 시작한다', async () => {
  await act(async () => render(<CameraPanel autoStart />))
  expect(robot.api.frame).toHaveBeenCalledOnce()
  expect(robot.api.vision).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: '조회 중지' })).toBeTruthy()
})

it('사진 조회가 실패해도 인식 결과는 표시한다', async () => {
  robot.api.frame.mockRejectedValue(new Error('사진 조회 실패'))
  render(<CameraPanel />)
  await openCamera()
  expect(screen.getByText('사진 조회 실패')).toBeTruthy()
  expect(screen.getByText('자전거')).toBeTruthy()
})

it('인식 결과 조회가 실패하면 점수를 지우고 사진은 유지한다', async () => {
  render(<CameraPanel />)
  await openCamera()
  robot.api.vision.mockRejectedValue(new Error('인식 조회 실패'))
  await act(async () => vi.advanceTimersByTimeAsync(1000))
  expect(screen.getByRole('alert').textContent).toContain('인식 조회 실패')
  expect(screen.queryByText('위험 · 5점')).toBeNull()
  expect(screen.getByRole('img').getAttribute('src')).toBe('/frame.jpg')
})

it('서버가 오래된 결과로 판단하면 현재 위험 점수를 숨긴다', async () => {
  robot.api.vision.mockResolvedValue({ ...result, fresh: false })
  render(<CameraPanel />)
  await openCamera()
  expect(screen.getByRole('status').textContent).toContain('오래된 인식 결과')
  expect(screen.queryByText('위험 · 5점')).toBeNull()
  expect(screen.getByText('마지막 사진의 물체')).toBeTruthy()
})

it('후속 응답이 멈추면 화면에서도 최신 결과 표시를 만료시킨다', async () => {
  const view = render(<CameraPanel />)
  await openCamera()
  robot.now += 3001
  view.rerender(<CameraPanel />)
  expect(screen.getByRole('status').textContent).toContain('오래된 인식 결과')
  expect(screen.queryByText('위험 · 5점')).toBeNull()
})

it.each([false, true])('모델 사용 가능 여부 %s일 때 사진 대기를 구분한다', async (available) => {
  robot.api.vision.mockResolvedValue({
    ...result,
    available,
    fresh: false,
    frameReceivedAt: null,
    detections: [],
  })
  render(<CameraPanel />)
  await openCamera()
  expect(screen.getByRole('status').textContent).toContain(
    available ? '사진을 기다리고' : '모델이 꺼져',
  )
  expect(screen.queryByText('위험 · 5점')).toBeNull()
})

it('중지 시 요청을 취소하고 늦은 응답과 추가 조회를 무시한다', async () => {
  let finish: (value: VisionResult) => void = () => {}
  robot.api.vision.mockImplementation(
    () =>
      new Promise<VisionResult>((resolve) => {
        finish = resolve
      }),
  )
  render(<CameraPanel />)
  await openCamera()
  const signal = robot.api.vision.mock.calls[0][0] as AbortSignal
  fireEvent.click(screen.getByRole('button', { name: '조회 중지' }))
  expect(signal.aborted).toBe(true)
  await act(async () => finish(result))
  await act(async () => vi.advanceTimersByTimeAsync(5000))
  expect(robot.api.vision).toHaveBeenCalledOnce()
  expect(screen.queryByText('자전거')).toBeNull()
})

it('시연 화면에는 예시임을 표시한다', async () => {
  robot.demo = true
  render(<CameraPanel />)
  expect(screen.getByText('시연용 이미지와 예시 인식 결과입니다.')).toBeTruthy()
  await openCamera()
  expect(screen.getByRole('img').getAttribute('alt')).toBe('시연용 카메라 이미지')
})
