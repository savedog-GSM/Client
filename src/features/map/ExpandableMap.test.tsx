import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ExpandableMap from './ExpandableMap'
import type { SafetyMapProps } from './SafetyMap'

vi.mock('./SafetyMap', () => ({
  default: (props: SafetyMapProps) => (
    <div>
      <output aria-label="지도 선택 위치">{JSON.stringify(props.start)}</output>
      <output aria-label="지도 초기 영역">{JSON.stringify(props.initialView)}</output>
      <button
        onClick={() =>
          props.onViewChange?.({ center: { latitude: 35.1, longitude: 126.8 }, level: 5 })
        }
      >
        지도 영역 이동
      </button>
      <button onClick={() => props.onSelect({ latitude: 35.2, longitude: 126.9 })}>
        확대 지도 위치 선택
      </button>
    </div>
  ),
}))
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value() {
        this.removeAttribute('open')
      },
    },
  })
})
afterEach(() => {
  for (const [name, descriptor] of [
    ['showModal', showModal],
    ['close', close],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})
const props: SafetyMapProps = {
  currentPosition: null,
  position: null,
  start: null,
  end: null,
  segments: [],
  reports: [],
  records: [],
  route: null,
  onSelect: vi.fn(),
  onBounds: vi.fn(),
}

it('현재 지도 영역으로 모달을 열고 선택 위치 변경을 두 지도에 반영한다', async () => {
  const user = userEvent.setup()
  const view = render(<ExpandableMap {...props} />)
  await user.click(screen.getByRole('button', { name: '지도 영역 이동' }))
  await user.click(screen.getByRole('button', { name: '전체 보기' }))
  const dialog = screen.getByRole('dialog', { name: '지도 전체 보기' })
  expect(within(dialog).getByLabelText('지도 초기 영역').textContent).toBe(
    JSON.stringify({ center: { latitude: 35.1, longitude: 126.8 }, level: 5 }),
  )
  await user.click(within(dialog).getByRole('button', { name: '확대 지도 위치 선택' }))
  expect(props.onSelect).toHaveBeenCalledWith({ latitude: 35.2, longitude: 126.9 })
  view.rerender(<ExpandableMap {...props} start={{ latitude: 35.2, longitude: 126.9 }} />)
  expect(
    screen
      .getAllByLabelText('지도 선택 위치')
      .every((item) => item.textContent === JSON.stringify({ latitude: 35.2, longitude: 126.9 })),
  ).toBe(true)
})

it('닫기와 Escape로 닫으면 배경 스크롤과 전체 보기 버튼 포커스를 복구한다', async () => {
  const user = userEvent.setup()
  const overflow = document.body.style.overflow
  render(<ExpandableMap {...props} />)
  const trigger = screen.getByRole('button', { name: '전체 보기' })
  await user.click(trigger)
  expect(document.body.style.overflow).toBe('hidden')
  await user.click(screen.getByRole('button', { name: '지도 전체 보기 닫기' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe(overflow)
  expect(document.activeElement).toBe(trigger)
  await user.click(trigger)
  fireEvent(screen.getByRole('dialog'), new Event('cancel'))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe(overflow)
})
