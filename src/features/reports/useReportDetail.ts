import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import type { Report } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'

export function useReportDetail(id: number) {
  const { api, reports, updateReport } = useRobot()
  const liveReport = reports.find((report) => report.id === id)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [receipt, setReceipt] = useState('')
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<'submit' | 'dismiss' | null>(null)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    api
      .report(id)
      .then((data) => {
        if (active) setReport(data)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [api, id, revision, liveReport])
  const hasPhoto = report?.hasPhoto ?? false
  useEffect(() => {
    if (!hasPhoto) return
    let active = true
    const load = () =>
      api
        .photo(id)
        .then((result) => {
          if (active) {
            setPhoto(result.url)
            setPhotoError('')
          }
        })
        .catch((error) => {
          if (active) {
            setPhoto('')
            setPhotoError(errorMessage(error))
          }
        })
    void load()
    const timer = setInterval(() => void load(), 240000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [api, id, hasPhoto, revision])
  async function processReport() {
    if (!report || !action) return
    setPending(true)
    setError('')
    try {
      const result =
        action === 'submit' ? await api.submit(id, receipt.trim()) : await api.dismiss(id)
      setReport(result)
      updateReport(result)
      setMessage(action === 'submit' ? '접수번호를 기록했습니다.' : '신고를 기각했습니다.')
      setAction(null)
    } catch (error) {
      setError(errorMessage(error))
      setAction(null)
      try {
        const latest = await api.report(id)
        setReport(latest)
        updateReport(latest)
      } catch {
        setMessage('최신 처리 상태를 확인하려면 다시 조회해주세요.')
      }
    } finally {
      setPending(false)
    }
  }
  const current =
    liveReport && ['SUBMITTED', 'DISMISSED'].includes(liveReport.status) ? liveReport : report
  const canProcess = current && ['PENDING', 'FAILED'].includes(current.status)
  const validReceipt =
    !!receipt.trim() &&
    receipt.trim().length <= 100 &&
    ![...receipt].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  return {
    current,
    error,
    photo,
    photoError,
    hasPhoto,
    receipt,
    setReceipt,
    pending,
    action,
    setAction,
    message,
    canProcess,
    validReceipt,
    processReport,
    retry: () => setRevision((value) => value + 1),
    handlePhotoError: () => {
      setPhoto('')
      setPhotoError('사진을 불러오지 못했습니다.')
    },
  }
}
