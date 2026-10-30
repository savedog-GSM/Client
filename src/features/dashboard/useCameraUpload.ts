import { useEffect, useRef, useState } from 'react'
import { errorMessage, type Api } from '../../api/client'

function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
}

export function useCameraUpload(api: Api) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uploadControllerRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    uploadControllerRef.current?.abort()
    uploadControllerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setError('이 브라우저에서는 카메라를 사용할 수 없습니다.')
      return
    }
    setStarting(true)
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const uploadController = new AbortController()
      uploadControllerRef.current = uploadController
      setActive(true)
      timerRef.current = setInterval(async () => {
        const video = videoRef.current
        if (!video?.videoWidth || sendingRef.current) return
        sendingRef.current = true
        try {
          const jpeg = await captureFrame(video)
          if (jpeg) await api.sendFrame(jpeg, uploadController.signal)
          setError('')
        } catch (uploadError) {
          setError(errorMessage(uploadError))
        } finally {
          sendingRef.current = false
        }
      }, 1000)
    } catch (cameraError) {
      stop()
      setError(errorMessage(cameraError))
    } finally {
      setStarting(false)
    }
  }

  useEffect(() => stop, [])

  return { videoRef, active, starting, error, start, stop }
}
