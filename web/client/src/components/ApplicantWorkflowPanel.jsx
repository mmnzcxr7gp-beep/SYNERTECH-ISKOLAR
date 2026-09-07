import React, { useState, useEffect, useRef } from 'react'
import ConfirmationDialog from './ConfirmationDialog'
import {
  CalendarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldIcon,
  DocumentIcon,
  ClockIcon
} from './Icons'

export default function ApplicantWorkflowPanel({ applicant, token, onApplicationUpdated }) {
  const [messages, setMessages] = useState([])
  const [conversation, setConversation] = useState(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'more_info' | 'resubmit' | 'schedule' | 'qualify' | 'approve' | 'reject'
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Confirmation dialog state
  const [confirmationConfig, setConfirmationConfig] = useState(null)

  // 1. More Info State
  const [infoTitle, setInfoTitle] = useState('Additional Information Required')
  const [infoInstructions, setInfoInstructions] = useState('')
  const [infoDueDate, setInfoDueDate] = useState('')
  const [infoPriority, setInfoPriority] = useState('NORMAL')
  const [infoUploadRequired, setInfoUploadRequired] = useState(false)

  // 2. Resubmission State
  const [resubDocId, setResubDocId] = useState('')
  const [resubDocType, setResubDocType] = useState('')
  const [resubReason, setResubReason] = useState('Document unreadable or blurred')
  const [resubInstructions, setResubInstructions] = useState('')

  // 3. Schedule State
  const [schedType, setSchedType] = useState('interview')
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [schedEndTime, setSchedEndTime] = useState('')
  const [schedLocation, setSchedLocation] = useState('')
  const [schedMeetingLink, setSchedMeetingLink] = useState('')
  const [schedInstructions, setSchedInstructions] = useState('')

  // 4. Approval State (Separate applicant note vs internal note)
  const [approvalApplicantMessage, setApprovalApplicantMessage] = useState(
    'Congratulations! You have met all requirements and have been awarded this scholarship grant.'
  )
  const [approvalInternalNote, setApprovalInternalNote] = useState('')
  const [approvalEffectiveDate, setApprovalEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [approvalDeadline, setApprovalDeadline] = useState('')
  const [approvalInstructions, setApprovalInstructions] = useState(
    'Please review your scholarship grant details and acknowledge acceptance in the ISKOLAR mobile app.'
  )
  const [approvalChecklist, setApprovalChecklist] = useState([
    'Acknowledge Scholarship Acceptance',
    'Submit Current Semester Enrollment Form',
    'Attend Scholar Orientation Session',
  ])

  // 5. Rejection State (Separate applicant message vs internal note)
  const [rejectionCategory, setRejectionCategory] = useState('COMPETITIVE_SLOT_LIMIT')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionApplicantMessage, setRejectionApplicantMessage] = useState(
    'Thank you for applying. After careful review of all submissions, we are unable to offer you an award for this grant cycle.'
  )
  const [rejectionInternalNote, setRejectionInternalNote] = useState('')

  const messagesEndRef = useRef(null)
  const appId = applicant?.id || applicant?._id

  useEffect(() => {
    if (!appId) return
    loadConversation()
  }, [appId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversation() {
    if (!appId) return
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/applications/${appId}/conversation`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const body = await res.json()
        setConversation(body.conversation)
        setMessages(body.messages || [])
      }
    } catch (e) {
      console.warn('Failed loading conversation:', e)
    } finally {
      setLoadingMessages(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    const trimmed = String(newMessage || '').trim()
    if (!trimmed || !appId || sendingMessage) return

    setSendingMessage(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/applications/${appId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to send message')
      }

      const body = await res.json()
      setMessages((prev) => [...prev, body.message])
      setNewMessage('')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSendingMessage(false)
    }
  }

  async function submitWorkflowAction(action, payload) {
    if (!appId || actionLoading) return
    setActionLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const res = await fetch(`/api/applications/${appId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, payload }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Action failed')
      }

      const body = await res.json()
      setSuccessMsg(body.message || 'Action executed successfully!')
      setActiveModal(null)
      setConfirmationConfig(null)
      loadConversation()
      if (onApplicationUpdated && body.application) {
        onApplicationUpdated(body.application)
      }
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (!applicant) return null

  const normStatus = String(applicant.status || '').toUpperCase()

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs font-bold text-rose-500 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Decision & Next Actions Toolbar */}
      <div
        className="rounded-2xl border p-4 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Human Decision & Workflow Actions
          </p>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Status: {normStatus}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {/* Action 1: Request More Info */}
          <button
            type="button"
            onClick={() => setActiveModal('more_info')}
            className="btn-secondary px-3 py-1.5 text-xs font-bold cursor-pointer"
          >
            Request Info
          </button>

          {/* Action 2: Request Resubmission */}
          <button
            type="button"
            onClick={() => {
              if (applicant.documents?.length) {
                setResubDocId(applicant.documents[0].id || applicant.documents[0]._id)
                setResubDocType(applicant.documents[0].requirement_name || 'Academic Document')
              }
              setActiveModal('resubmit')
            }}
            className="btn-secondary px-3 py-1.5 text-xs font-bold cursor-pointer"
          >
            Request Resubmission
          </button>

          {/* Action 3: Schedule Interview / Exam */}
          <button
            type="button"
            onClick={() => setActiveModal('schedule')}
            className="btn-secondary px-3 py-1.5 text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Schedule Event</span>
          </button>

          {/* Action 4: Qualify for Final Review */}
          <button
            type="button"
            onClick={() => submitWorkflowAction('QUALIFY_FOR_FINAL_REVIEW', {})}
            className="btn-secondary px-3 py-1.5 text-xs font-bold text-amber-500 hover:border-amber-500/50 cursor-pointer"
          >
            Qualify for Final Review
          </button>

          {/* Action 5: Approve */}
          <button
            type="button"
            onClick={() => setActiveModal('approve')}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Approve Award
          </button>

          {/* Action 6: Reject */}
          <button
            type="button"
            onClick={() => setActiveModal('reject')}
            className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Reject Application
          </button>
        </div>
      </div>

      {/* Secure In-App Application Messaging Thread */}
      <div
        className="rounded-2xl border shadow-sm flex flex-col h-80"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="p-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold truncate" style={{ color: 'var(--text-heading)' }}>
              Secure Channel: {applicant.student_name || 'Student Candidate'}
            </span>
          </div>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Application-Scoped Thread
          </span>
        </div>

        {/* Message List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs">
          {loadingMessages ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-4">Loading conversation thread…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-muted)] py-8">
              No messages in this thread yet. Send a message or workflow request to begin.
            </p>
          ) : (
            messages.map((m, idx) => {
              const isProvider = m.senderRole === 'provider' || m.sender_role === 'provider' || m.senderRole === 'sponsor' || m.sender_role === 'sponsor'
              const isSystem = m.messageType !== 'TEXT' && m.message_type !== 'TEXT'
              const dateStr = new Date(m.createdAt || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

              if (isSystem) {
                return (
                  <div key={m.id || m._id || idx} className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200">
                    <p className="font-semibold text-[11px] whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[9px] text-indigo-400 mt-1">{dateStr} • System Notification</p>
                  </div>
                )
              }

              return (
                <div key={m.id || m._id || idx} className={`flex flex-col ${isProvider ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] p-2.5 rounded-2xl ${
                      isProvider
                        ? 'bg-[var(--primary)] text-white rounded-br-none'
                        : 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-xs">{m.body}</p>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 px-1">
                    {isProvider ? 'You (Provider)' : applicant.student_name || 'Student'} • {dateStr}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="p-2.5 border-t flex items-center gap-2 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a secure message to the applicant..."
            disabled={sendingMessage}
            className="flex-1 rounded-xl border p-2 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={sendingMessage || !newMessage.trim()}
            className="btn-primary px-3.5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {sendingMessage ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* ACTION MODALS & FORMS */}
      {/* ========================================================================= */}

      {/* 1. Request More Info Modal */}
      {activeModal === 'more_info' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Request Additional Information</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-xs font-bold p-1 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Specify the details the applicant must submit before final evaluation.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Instructions / Question *</label>
                <textarea
                  value={infoInstructions}
                  onChange={(e) => setInfoInstructions(e.target.value)}
                  placeholder="e.g. Please clarify your registered academic units and semester status."
                  className="mt-1 w-full rounded-xl border p-2.5 h-20 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Response Due Date</label>
                  <input
                    type="date"
                    value={infoDueDate}
                    onChange={(e) => setInfoDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    value={infoPriority}
                    onChange={(e) => setInfoPriority(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent (48 Hours)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={actionLoading || !infoInstructions.trim()}
                onClick={() => submitWorkflowAction('REQUEST_MORE_INFO', {
                  title: infoTitle,
                  instructions: infoInstructions,
                  dueDate: infoDueDate,
                  priority: infoPriority,
                  uploadRequired: infoUploadRequired,
                })}
                className="btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Request Resubmission Modal */}
      {activeModal === 'resubmit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Request Document Resubmission</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-xs font-bold p-1 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Select which uploaded file failed inspection and provide specific instructions for re-upload.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Affected Document *</label>
                <select
                  value={resubDocId}
                  onChange={(e) => {
                    setResubDocId(e.target.value)
                    const doc = applicant.documents?.find(d => String(d.id || d._id) === e.target.value)
                    if (doc) setResubDocType(doc.requirement_name || doc.originalname)
                  }}
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  {applicant.documents?.map((d) => (
                    <option key={d.id || d._id} value={d.id || d._id}>
                      {d.requirement_name || d.originalname || 'Document'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Deficiency Reason *</label>
                <select
                  value={resubReason}
                  onChange={(e) => setResubReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="Document unreadable or blurred">Document unreadable or blurred</option>
                  <option value="Missing official seal or registrar signature">Missing official seal or registrar signature</option>
                  <option value="Outdated semester or school year">Outdated semester or school year</option>
                  <option value="Student name mismatch on academic record">Student name mismatch on academic record</option>
                  <option value="Incorrect document type attached">Incorrect document type attached</option>
                  <option value="Cut-off or incomplete pages">Cut-off or incomplete pages</option>
                </select>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Specific Instructions for Student</label>
                <textarea
                  value={resubInstructions}
                  onChange={(e) => setResubInstructions(e.target.value)}
                  placeholder="e.g. Please upload an official scanned copy with registrar digital signature seal."
                  className="mt-1 w-full rounded-xl border p-2.5 h-16 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => submitWorkflowAction('REQUEST_RESUBMISSION', {
                  documentId: resubDocId,
                  documentType: resubDocType || 'Academic Document',
                  reason: resubReason,
                  instructions: resubInstructions,
                })}
                className="btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Submitting...' : 'Request Resubmission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Schedule Interview / Exam Modal */}
      {activeModal === 'schedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Schedule Candidate Event</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-xs font-bold p-1 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Event Type *</label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="interview">Candidate Panel Interview</option>
                  <option value="exam">Qualifying Examination</option>
                  <option value="orientation">Scholar Orientation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Date *</label>
                  <input
                    type="date"
                    value={schedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Time *</label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Venue / Meeting Link</label>
                <input
                  type="text"
                  value={schedMeetingLink || schedLocation}
                  onChange={(e) => {
                    setSchedMeetingLink(e.target.value)
                    setSchedLocation(e.target.value)
                  }}
                  placeholder="https://meet.google.com/abc-xyz or Rm 302 Admin Hall"
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Preparation Instructions</label>
                <textarea
                  value={schedInstructions}
                  onChange={(e) => setSchedInstructions(e.target.value)}
                  placeholder="e.g. Please bring a valid school ID and prepare a 2-minute introductory presentation."
                  className="mt-1 w-full rounded-xl border p-2 h-14 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={actionLoading || !schedDate || !schedTime}
                onClick={() => submitWorkflowAction(schedType === 'exam' ? 'SCHEDULE_EXAMINATION' : 'SCHEDULE_INTERVIEW', {
                  date: schedDate,
                  time: schedTime,
                  endTime: schedEndTime,
                  location: schedLocation,
                  meetingLink: schedMeetingLink,
                  instructions: schedInstructions,
                })}
                className="btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Approve Application Form (Opens Confirmation Dialog) */}
      {activeModal === 'approve' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">Approve Scholarship Award</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-xs font-bold p-1 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Officially award the scholarship grant to this candidate.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Applicant-Visible Congratulatory Message *
                </label>
                <textarea
                  value={approvalApplicantMessage}
                  onChange={(e) => setApprovalApplicantMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 h-16 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Internal Reviewer Note (Never shared with student)
                </label>
                <input
                  type="text"
                  value={approvalInternalNote}
                  onChange={(e) => setApprovalInternalNote(e.target.value)}
                  placeholder="e.g. Approved based on outstanding academic rank and completed panel interview."
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Effective Grant Date</label>
                  <input
                    type="date"
                    value={approvalEffectiveDate}
                    onChange={(e) => setApprovalEffectiveDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Acceptance Deadline</label>
                  <input
                    type="date"
                    value={approvalDeadline}
                    onChange={(e) => setApprovalDeadline(e.target.value)}
                    className="mt-1 w-full rounded-xl border p-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-semibold flex items-center justify-between">
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg('')} className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">✕</button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={!approvalApplicantMessage.trim() || actionLoading}
                onClick={async () => {
                  await submitWorkflowAction('APPROVE_APPLICATION', {
                    approvalNote: approvalApplicantMessage,
                    internalNote: approvalInternalNote,
                    effectiveDate: approvalEffectiveDate,
                    acceptanceDeadline: approvalDeadline,
                    scholarshipInstructions: approvalInstructions,
                    nextStepChecklist: approvalChecklist,
                  })
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'Awarding…' : 'Proceed to Award'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reject Application Form (Opens Confirmation Dialog) */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Reject Application</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-xs font-bold p-1 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Provide a professional rationale for this decision. Empty reasons are strictly prohibited.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>Rejection Category *</label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="COMPETITIVE_SLOT_LIMIT">Competitive slot limit reached</option>
                  <option value="ACADEMIC_CRITERIA_UNMET">Minimum academic GPA criteria unmet</option>
                  <option value="DOCUMENT_INELIGIBLE">Documents incomplete or unverified</option>
                  <option value="INCOME_THRESHOLD_EXCEEDED">Income threshold exceeded</option>
                  <option value="OTHER">Other evaluation rationale</option>
                </select>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Applicant-Visible Message *
                </label>
                <textarea
                  value={rejectionApplicantMessage}
                  onChange={(e) => setRejectionApplicantMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-2.5 h-16 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Internal Reviewer Note (Confidential)
                </label>
                <input
                  type="text"
                  value={rejectionInternalNote}
                  onChange={(e) => setRejectionInternalNote(e.target.value)}
                  placeholder="e.g. Evaluated against batch ranking; student scored 74% below cutoff 80%."
                  className="mt-1 w-full rounded-xl border p-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-semibold flex items-center justify-between">
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg('')} className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">✕</button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setActiveModal(null)} className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={!rejectionApplicantMessage.trim() || actionLoading}
                onClick={async () => {
                  await submitWorkflowAction('REJECT_APPLICATION', {
                    category: rejectionCategory,
                    reason: rejectionApplicantMessage,
                    applicantMessage: rejectionApplicantMessage,
                    internalNote: rejectionInternalNote,
                  })
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading ? 'Declining…' : 'Proceed to Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Component */}
      {confirmationConfig && (
        <ConfirmationDialog
          open={Boolean(confirmationConfig)}
          title={confirmationConfig.title}
          message={confirmationConfig.message}
          confirmText={confirmationConfig.confirmText}
          isDestructive={confirmationConfig.isDestructive}
          isProcessing={actionLoading}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={() => setConfirmationConfig(null)}
        />
      )}
    </div>
  )
}
