const MAX_EDGE = 1280
const MAX_BYTES = 2 * 1024 * 1024
const QUALITIES = [0.85, 0.7, 0.55]

export const ACCEPTED_TYPES = 'image/jpeg,image/png'

export class FacePhotoError extends Error {}

export async function prepareFacePhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') {
    if (file.size > MAX_BYTES) throw new FacePhotoError(tooLargeMessage())
    return file
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new FacePhotoError('사진을 읽지 못했습니다. JPEG 또는 PNG 사진을 선택해주세요.')
  }
  try {
    const canvas = drawScaled(bitmap)
    for (const quality of QUALITIES) {
      const jpeg = await toJpeg(canvas, quality)
      if (jpeg.size <= MAX_BYTES)
        return new File([jpeg], jpegName(file.name), { type: 'image/jpeg' })
    }
    throw new FacePhotoError(tooLargeMessage())
  } finally {
    bitmap.close()
  }
}

function drawScaled(bitmap: ImageBitmap) {
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new FacePhotoError('이 브라우저에서는 사진을 준비할 수 없습니다.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new FacePhotoError('사진을 변환하지 못했습니다.'))),
      'image/jpeg',
      quality,
    )
  })
}

function jpegName(name: string) {
  return `${name.replace(/\.[^.]+$/, '')}.jpg`
}

function tooLargeMessage() {
  return '사진 용량이 너무 큽니다. 더 작게 찍은 사진을 선택해주세요.'
}
