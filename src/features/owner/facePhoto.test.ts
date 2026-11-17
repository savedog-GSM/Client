import { afterEach, expect, it, vi } from 'vitest'
import { prepareFacePhoto } from './facePhoto'

function stubCanvas(sizes: number[]) {
  const queue = [...sizes]
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    const size = queue.shift() ?? 0
    callback(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }))
  })
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width, height, close } as unknown as ImageBitmap),
  )
  return close
}

afterEach(() => vi.unstubAllGlobals())

it('사진을 줄여 JPEG로 바꾼다', async () => {
  const close = stubBitmap(4000, 3000)
  stubCanvas([500_000])
  const photo = await prepareFacePhoto(new File(['raw'], 'owner.png', { type: 'image/png' }))
  expect(photo.type).toBe('image/jpeg')
  expect(photo.name).toBe('owner.jpg')
  expect(close).toHaveBeenCalledOnce()
})

it('용량이 넘으면 품질을 낮춰 다시 시도한다', async () => {
  stubBitmap(2000, 2000)
  stubCanvas([3_000_000, 1_500_000])
  const photo = await prepareFacePhoto(new File(['raw'], 'owner.jpg', { type: 'image/jpeg' }))
  expect(photo.size).toBe(1_500_000)
})

it('끝까지 용량이 넘으면 안내한다', async () => {
  stubBitmap(2000, 2000)
  stubCanvas([3_000_000, 3_000_000, 3_000_000])
  await expect(
    prepareFacePhoto(new File(['raw'], 'owner.jpg', { type: 'image/jpeg' })),
  ).rejects.toThrow('사진 용량이 너무 큽니다. 더 작게 찍은 사진을 선택해주세요.')
})

it('읽지 못하는 사진은 안내한다', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  await expect(
    prepareFacePhoto(new File(['raw'], 'owner.webp', { type: 'image/webp' })),
  ).rejects.toThrow('사진을 읽지 못했습니다. JPEG 또는 PNG 사진을 선택해주세요.')
})
