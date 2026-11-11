import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice, PageTitle } from '../../components/ui'
import FaceManager from './FaceManager'
import OwnerSightingCard from './OwnerSightingCard'
import ReturnControl from './ReturnControl'
import useOwnerStatus from './useOwnerStatus'
import './owner.css'

export default function OwnerPage() {
  const { api, demo } = useRobot()
  const { sighting, returnState, error, loading, refresh } = useOwnerStatus()
  const update = () => void refresh()
  return (
    <>
      <PageTitle
        title="주인 찾기"
        description="주인 얼굴을 인식하고 스마트폰의 현재 위치로 로보독을 돌아오게 합니다."
        action={<button onClick={update}>새로고침</button>}
      />
      <ErrorNotice message={error} retry={update} />
      <div className="owner-grid">
        <FaceManager
          api={api}
          registeredFaces={sighting?.registeredFaces ?? 0}
          disabled={loading || demo}
          onChange={update}
        />
        <OwnerSightingCard result={sighting} />
        <ReturnControl api={api} state={returnState} disabled={loading || demo} onChange={update} />
      </div>
    </>
  )
}
