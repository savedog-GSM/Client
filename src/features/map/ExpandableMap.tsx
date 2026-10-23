import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
import SafetyMap, { type MapView, type SafetyMapProps } from './SafetyMap'
import './map-dialog.css'

export default function ExpandableMap(props: SafetyMapProps) {
  const [expanded, setExpanded] = useState(false)
  const view = useRef<MapView | undefined>(undefined)
  const button = useRef<HTMLButtonElement>(null)
  const saveView = useCallback((value: MapView) => {
    view.current = value
  }, [])
  function close() {
    setExpanded(false)
  }
  return (
    <>
      <div className="expandable-map">
        <SafetyMap {...props} onViewChange={saveView} />
        <button
          ref={button}
          className="map-expand-button"
          onClick={() => setExpanded(true)}
          aria-haspopup="dialog"
        >
          <Maximize2 size={15} />
          전체 보기
        </button>
      </div>
      {expanded &&
        createPortal(
          <MapDialog {...props} initialView={view.current} onClose={close} returnFocus={button} />,
          document.body,
        )}
    </>
  )
}

function MapDialog({
  onClose,
  returnFocus,
  ...props
}: SafetyMapProps & { onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const trigger = returnFocus.current
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      trigger?.focus({ preventScroll: true })
    }
  }, [returnFocus])
  return (
    <dialog
      ref={dialog}
      className="map-dialog"
      aria-labelledby="map-dialog-title"
      onCancel={onClose}
    >
      <header className="map-dialog-header">
        <div>
          <h2 id="map-dialog-title">지도 전체 보기</h2>
          <p>지도를 움직이거나 확대해서 확인하세요. 출발지와 도착지도 선택할 수 있습니다.</p>
        </div>
        <button onClick={onClose} aria-label="지도 전체 보기 닫기" autoFocus>
          <X size={22} />
        </button>
      </header>
      <div className="map-legend">
        <span className="safe">● 안전</span>
        <span className="caution">● 주의</span>
        <span className="danger">● 위험</span>
        <span>● 보라색: 탐색 경로</span>
      </div>
      <SafetyMap {...props} focus={null} />
      <footer className="map-dialog-footer">
        <span>선택한 위치와 경로는 원래 화면에도 반영됩니다.</span>
        <button onClick={onClose}>지도 닫기</button>
      </footer>
    </dialog>
  )
}
