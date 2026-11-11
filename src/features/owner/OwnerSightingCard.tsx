import { Camera, ScanFace } from 'lucide-react'
import type { OwnerSightingResult } from '../../api/types'
import { number, time } from '../../components/ui'
import { directionNames } from './ownerLabels'

function status(result: OwnerSightingResult | null) {
  if (!result?.available) return ['모델 확인 필요', 'unknown']
  if (result.registeredFaces === 0) return ['얼굴 등록 필요', 'caution']
  if (!result.fresh) return ['새 사진 대기 중', 'unknown']
  if (result.ownerVisible) return ['주인 발견', 'safe']
  return ['주인 찾는 중', 'caution']
}

export default function OwnerSightingCard({ result }: { result: OwnerSightingResult | null }) {
  const [label, tone] = status(result)
  const sighting = result?.sighting
  return (
    <section className="panel owner-card">
      <div className="section-heading">
        <div>
          <h2>카메라 주인 인식</h2>
          <p>로보독 카메라의 가장 최근 얼굴 인식 결과입니다.</p>
        </div>
        <span className={`badge ${tone}`}>{label}</span>
      </div>
      <div className={`owner-sighting ${result?.ownerVisible && result.fresh ? 'visible' : ''}`}>
        {result?.ownerVisible && result.fresh ? <ScanFace size={52} /> : <Camera size={52} />}
        <strong>{label}</strong>
        <span>
          {sighting?.direction
            ? directionNames[sighting.direction]
            : '화면 위치를 확인하고 있습니다.'}
        </span>
      </div>
      <dl className="details owner-details">
        <div>
          <dt>화면 속 얼굴</dt>
          <dd>{sighting ? `${sighting.facesInFrame}명` : '수신 대기'}</dd>
        </div>
        <div>
          <dt>주인 유사도</dt>
          <dd>{number(sighting?.similarity == null ? null : sighting.similarity * 100, '%')}</dd>
        </div>
        <div>
          <dt>사진 수신</dt>
          <dd>{time(sighting?.frameReceivedAt ?? null)}</dd>
        </div>
      </dl>
    </section>
  )
}
