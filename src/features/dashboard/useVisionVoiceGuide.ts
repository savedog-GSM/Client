import { useEffect, useRef } from 'react'
import type { VisionResult } from '../../api/types'
import { useVoiceGuide } from '../../components/useVoiceGuide'

function subject(name: string) {
  const last = name.charCodeAt(name.length - 1)
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
  return `${name}${hasBatchim ? '이' : '가'}`
}

export function visionVoiceMessage(result: VisionResult | null, fresh: boolean) {
  if (!result?.available || !result.frameReceivedAt || !fresh) return null
  const detection = result.detections[0]
  if (!detection) {
    return result.level === 'SAFE' ? '전방 보도블럭 상태가 양호해요.' : null
  }
  const name = detection.name || detection.label
  const label = `${detection.label} ${name}`.toLowerCase()
  if (label.includes('person') || label.includes('사람') || label.includes('pedestrian')) {
    return '앞에 사람이 있어요. 주의하세요.'
  }
  if (label.includes('pothole') || label.includes('파임') || label.includes('파여')) {
    return '앞에 보도블럭이 파여 있어요. 주의하세요.'
  }
  return `앞에 ${subject(name)} 있어요. 주의하세요.`
}

export function useVisionVoiceGuide(result: VisionResult | null, fresh: boolean) {
  const voice = useVoiceGuide()
  const previous = useRef<string | null>(null)
  const message = visionVoiceMessage(result, fresh)

  useEffect(() => {
    if (!message || message === previous.current) return
    previous.current = message
    voice.speak(message)
  }, [message, voice])
}
