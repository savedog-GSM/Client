import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import FaceManager from './FaceManager'

it('선택한 얼굴 사진을 등록하고 완료 결과를 표시한다', async () => {
  const api = {
    registerOwnerFace: vi.fn().mockResolvedValue({
      id: 7,
      faceScore: 0.96,
      similarityToOthers: null,
      registeredCount: 1,
      createdAt: '2026-11-11T10:00:00',
    }),
    deleteOwnerFaces: vi.fn(),
  }
  const onChange = vi.fn()
  render(
    <FaceManager api={api as never} registeredFaces={0} disabled={false} onChange={onChange} />,
  )
  const image = new File(['face'], 'owner.jpg', { type: 'image/jpeg' })
  fireEvent.change(screen.getByLabelText('얼굴 사진'), { target: { files: [image] } })
  fireEvent.click(screen.getByRole('button', { name: '얼굴 등록' }))
  await waitFor(() => expect(api.registerOwnerFace).toHaveBeenCalledWith(image))
  expect(screen.getByText('얼굴 #7 등록 완료')).toBeTruthy()
  expect(onChange).toHaveBeenCalledOnce()
})
