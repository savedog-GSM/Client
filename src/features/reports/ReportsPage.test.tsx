import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { report } from '../../test/fixtures'
import { ReportDetail } from './ReportsPage'

const robot = vi.hoisted(() => ({
  api: { report: vi.fn(), submit: vi.fn(), dismiss: vi.fn(), photo: vi.fn() },
  reports: [] as unknown[],
  updateReport: vi.fn(),
}))
vi.mock('../../app/RobotProvider', () => ({ useRobot: () => robot }))
beforeEach(() => {
  vi.clearAllMocks()
  robot.reports = [report]
  robot.api.report.mockResolvedValue(report)
})
it('접수번호 입력과 확인을 거쳐 제출하고 중복 처리를 막는다', async () => {
  robot.api.submit.mockResolvedValue({ ...report, status: 'SUBMITTED', receiptNumber: 'R-2026-1' })
  render(<ReportDetail id={report.id} />)
  const button = await screen.findByRole('button', { name: '접수번호 등록' })
  expect((button as HTMLButtonElement).disabled).toBe(true)
  await userEvent.type(screen.getByLabelText('접수번호'), 'R-2026-1')
  await userEvent.click(button)
  expect(robot.api.submit).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: '확인' }))
  await waitFor(() => expect(robot.api.submit).toHaveBeenCalledWith(report.id, 'R-2026-1'))
  await waitFor(() => expect(screen.queryByRole('button', { name: '접수번호 등록' })).toBeNull())
})
it('다른 관제자가 이미 처리한 신고는 오류 뒤 재조회한다', async () => {
  robot.api.dismiss.mockRejectedValue(
    new ApiError(409, 'REPORT_ALREADY_PROCESSED', '이미 처리된 신고입니다.'),
  )
  render(<ReportDetail id={report.id} />)
  await userEvent.click(await screen.findByRole('button', { name: '기각' }))
  robot.api.report.mockResolvedValue({ ...report, status: 'DISMISSED' })
  await userEvent.click(screen.getByRole('button', { name: '확인' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('이미 처리된 신고'))
  await waitFor(() => expect(screen.queryByRole('button', { name: '기각' })).toBeNull())
})
it('상세 조회가 제출 완료이면 오래된 목록 상태로 되돌리지 않는다', async () => {
  robot.api.report.mockResolvedValue({ ...report, status: 'SUBMITTED', receiptNumber: 'R-1' })
  render(<ReportDetail id={report.id} />)
  await screen.findByText('제출 완료')
  expect(screen.queryByRole('button', { name: '기각' })).toBeNull()
})
