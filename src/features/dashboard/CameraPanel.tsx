import { useState } from 'react'
import { useRobot } from '../../app/RobotProvider'
import { Empty } from '../../components/ui'
import { useCameraFeed } from './useCameraFeed'
import VisionPanel from './VisionPanel'
import { useCameraUpload } from './useCameraUpload'

export default function CameraPanel({ autoStart = false }: { autoStart?: boolean }) {
  const { api, now, demo } = useRobot()
  const [enabled, setEnabled] = useState(autoStart)
  const { url, error, visionError, vision, clearFrame, handleImageError } = useCameraFeed(
    api,
    enabled,
  )
  const cameraUpload = useCameraUpload(api)
  return (
    <section className="panel dashboard-camera">
      <div className="section-heading">
        <div>
          <h2>카메라 및 물체 인식</h2>
          <p>
            {demo
              ? '시연용 이미지와 예시 인식 결과입니다.'
              : '1초마다 최신 프레임과 인식 결과를 조회합니다.'}
          </p>
        </div>
        <button
          aria-pressed={enabled}
          onClick={() => {
            setEnabled(!enabled)
            clearFrame()
          }}
        >
          {enabled ? '조회 중지' : '카메라 보기'}
        </button>
      </div>
      {enabled && url ? (
        <img
          className="camera-image"
          src={url}
          alt={demo ? '시연용 카메라 이미지' : '로보독 최신 카메라 프레임'}
          onError={handleImageError}
        />
      ) : (
        <Empty>
          {enabled
            ? error || '프레임을 불러오는 중입니다.'
            : '카메라 보기를 누르면 프레임과 물체 인식 결과를 확인할 수 있습니다.'}
        </Empty>
      )}
      {enabled && (
        <VisionPanel
          result={vision?.result ?? null}
          fresh={!!vision?.result.fresh && now - vision.requestedAt <= 3000}
          error={visionError}
        />
      )}
      {!demo && (
        <div className="camera-upload">
          <div className="section-heading">
            <div>
              <h3>브라우저 카메라 전송</h3>
              <p>카메라 영상을 1초마다 로보독 프레임으로 전송합니다.</p>
            </div>
            <button
              aria-pressed={cameraUpload.active}
              disabled={cameraUpload.starting}
              onClick={() =>
                void (cameraUpload.active ? cameraUpload.stop() : cameraUpload.start())
              }
            >
              {cameraUpload.starting
                ? '카메라 연결 중…'
                : cameraUpload.active
                  ? '전송 중지'
                  : '카메라 전송 시작'}
            </button>
          </div>
          <video
            ref={cameraUpload.videoRef}
            className="camera-upload-preview"
            muted
            playsInline
            hidden={!cameraUpload.active}
          />
          {cameraUpload.error && <p className="error-notice">{cameraUpload.error}</p>}
        </div>
      )}
    </section>
  )
}
