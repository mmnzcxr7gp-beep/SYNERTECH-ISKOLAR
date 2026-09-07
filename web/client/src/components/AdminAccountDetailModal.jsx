import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  HistoryIcon,
  DocumentIcon,
  GraduationCapIcon,
  BuildingIcon,
  LockIcon,
  XIcon
} from './Icons'

export default function AdminAccountDetailModal({
  accountId,
  isOpen,
  onClose,
  token,
  onAccountUpdated,
  initialTab = 'overview',
  initialActionDialog = null,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab || 'overview')

  // Action Dialog State
  const [actionDialog, setActionDialog] = useState(initialActionDialog || null)
  const [actionReason, setActionReason] = useState('')
  const [actionMfaCode, setActionMfaCode] = useState('')
  const [confirmTypedText, setConfirmTypedText] = useState('')
  const [editFormData, setEditFormData] = useState({})
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Document Preview State
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  const fetchDetails = async () => {
    if (!accountId || !token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || `Failed to fetch account details (HTTP ${res.status})`)
      }
      const body = await res.json()
      setData(body)
      if (body.account) {
        setEditFormData({
          name: body.account.name || '',
          phone: body.account.phone || body.account.phoneNumber || '',
          schoolName: body.account.schoolName || body.account.school || '',
          course: body.account.course || '',
          gpa: body.account.gpa ?? '',
          company: body.account.company || '',
          organization_website: body.account.organization_website || '',
          address: body.account.address || '',
          city: body.account.city || '',
        })
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to account service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && accountId) {
      previousActiveElement.current = document.activeElement
      document.body.style.overflow = 'hidden'
      fetchDetails()
      setActiveTab(initialTab || 'overview')
      setActionDialog(initialActionDialog || null)
      setActionError('')
      setActionSuccess('')
      setActionReason('')
      setConfirmTypedText('')
      setActionMfaCode('')
      setPreviewDoc(null)
    }

    return () => {
      document.body.style.overflow = ''
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
      }
    }
  }, [isOpen, accountId, initialTab, initialActionDialog])

  // Cleanup blob URL when preview doc changes
  useEffect(() => {
    if (!previewDoc) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      setPreviewError('')
      setPreviewLoading(false)
    }
  }, [previewDoc])

  // Fetch document preview securely with JWT
  const loadDocumentPreview = async (doc) => {
    setPreviewDoc(doc)
    setPreviewLoading(true)
    setPreviewError('')
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
    }

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/documents/${doc.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Document object is missing or not found in storage.')
        } else if (res.status === 403) {
          throw new Error('Access denied: Administrator oversight permissions required.')
        } else {
          throw new Error(`Storage temporarily unavailable (HTTP ${res.status})`)
        }
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPreviewBlobUrl(url)
    } catch (err) {
      setPreviewError(err.message || 'Document preview unavailable')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Keyboard navigation & Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewDoc) {
          setPreviewDoc(null)
        } else if (actionDialog) {
          setActionDialog(null)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, previewDoc, actionDialog, onClose])

  const executeAction = async (endpoint, method = 'PATCH', payload = {}) => {
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.message || `Operation failed (HTTP ${res.status})`)
      }
      setActionSuccess(result.message || 'Action executed successfully')
      setTimeout(() => {
        setActionDialog(null)
        setActionSuccess('')
        fetchDetails()
        if (onAccountUpdated) onAccountUpdated()
      }, 1200)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (!isOpen) return null

  const acc = data?.account || {}
  const applications = data?.applications || []
  const managedScholarships = data?.managedScholarships || []
  const documents = data?.documents || []
  const auditHistory = data?.auditHistory || []
  const versionHistory = data?.versionHistory || []

  const isStudent = String(acc.role).toLowerCase() === 'student'

  const getStatusBadge = (status) => {
    const s = String(status || 'ACTIVE').toUpperCase()
    if (s === 'ACTIVE') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    if (s === 'PENDING_ADMIN_REVIEW' || s === 'PENDING_EMAIL_VERIFICATION') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    if (s === 'SUSPENDED') return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    if (s === 'REJECTED') return 'bg-red-500/15 text-red-400 border-red-500/30'
    if (s === 'DELETION_PENDING') return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    if (s === 'ARCHIVED') return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-account-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionDialog && !previewDoc) {
          onClose()
        }
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative z-[1001] w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg-elevated, #0d121f)',
          borderColor: 'var(--border, #1f293d)',
          color: 'var(--text-primary, #ffffff)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border, #1f293d)' }}>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-[#FF6D29]/20 text-[#FF6D29] flex items-center justify-center font-black text-lg border border-[#FF6D29]/30">
              {(acc.name || acc.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="admin-account-modal-title" className="text-lg sm:text-xl font-black truncate" style={{ color: 'var(--text-heading, #ffffff)' }}>
                  {acc.name || (loading ? 'Loading Account…' : 'Account Details')}
                </h2>
                {acc.accountStatus && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(acc.accountStatus)}`}>
                    {acc.accountStatus}
                  </span>
                )}
                {acc.role && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-white border border-white/20">
                    {acc.role}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 truncate text-slate-400">
                {acc.email ? `${acc.email} • ID #${acc.id}` : `ID #${accountId}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center transition hover:bg-white/10 cursor-pointer text-slate-400 hover:text-white"
            style={{ borderColor: 'var(--border, #1f293d)' }}
            aria-label="Close Account Modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-2 border-b overflow-x-auto" style={{ borderColor: 'var(--border, #1f293d)' }}>
          {[
            { id: 'overview', label: 'Profile Overview' },
            { id: 'submissions', label: isStudent ? `Applications (${applications.length})` : `Scholarships (${managedScholarships.length})` },
            { id: 'documents', label: `Documents & OCR (${documents.length})` },
            { id: 'actions', label: 'Security & Controls' },
            { id: 'history', label: `Audit & History (${auditHistory.length + versionHistory.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2.5 text-xs font-extrabold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#FF6D29] text-[#FF6D29]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Body Content */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#FF6D29] border-t-transparent mb-3" />
              <p>Loading account details and evidence…</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-rose-400" />
                Error Loading Account Details
              </h4>
              <p className="text-xs">{error}</p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={fetchDetails}
                  className="px-3 py-1.5 rounded-xl bg-[#FF6D29] text-white text-xs font-bold hover:bg-[#e05a1b] transition cursor-pointer"
                >
                  Retry Loading
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl border border-white/20 text-slate-300 text-xs font-bold hover:bg-white/10 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">Basic Information</h4>
                        <button
                          type="button"
                          onClick={() => { setActionDialog('edit'); setActionError(''); }}
                          className="text-[11px] font-bold text-[#FF6D29] hover:underline cursor-pointer"
                        >
                          ✎ Edit Profile
                        </button>
                      </div>
                      <div className="text-xs space-y-1.5">
                        <div><strong className="text-white">Full Name:</strong> {acc.name || 'Not provided'}</div>
                        <div><strong className="text-white">Email:</strong> {acc.email}</div>
                        <div><strong className="text-white">Phone:</strong> {acc.phone || acc.phoneNumber || 'Not provided'}</div>
                        <div><strong className="text-white">Registered Date:</strong> {new Date(acc.created_at || acc.createdAt || Date.now()).toLocaleDateString()}</div>
                        <div><strong className="text-white">Privacy Consent:</strong> <span className="text-emerald-400 font-bold">Consented (Active)</span></div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">
                        {isStudent ? 'Academic Information' : 'Organization Details'}
                      </h4>
                      <div className="text-xs space-y-1.5">
                        {isStudent ? (
                          <>
                            <div><strong className="text-white">School / University:</strong> {acc.schoolName || acc.school || 'N/A'}</div>
                            <div><strong className="text-white">Degree / Course:</strong> {acc.course || 'N/A'}</div>
                            <div><strong className="text-white">Current GPA:</strong> {acc.gpa ?? 'N/A'}</div>
                          </>
                        ) : (
                          <>
                            <div><strong className="text-white">Company / Org:</strong> {acc.company || 'N/A'}</div>
                            <div><strong className="text-white">Website:</strong> {acc.organization_website ? <a href={acc.organization_website} target="_blank" rel="noreferrer" className="text-[#FF6D29] underline">{acc.organization_website}</a> : 'N/A'}</div>
                            <div><strong className="text-white">Domain:</strong> {acc.company_domain || 'N/A'}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Verification Banner */}
                  <div className="p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-4" style={{ backgroundColor: 'rgba(255, 109, 41, 0.05)', borderColor: 'rgba(255, 109, 41, 0.25)' }}>
                    <div>
                      <h4 className="text-xs font-black text-white">Administrator Verification State</h4>
                      <p className="text-[11px] mt-0.5 text-slate-400">
                        Status: <strong>{acc.accountStatus || 'ACTIVE'}</strong> • Verified: <strong>{acc.isVerified || acc.sponsor_verified ? 'Yes' : 'No'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(!acc.isVerified && acc.accountStatus !== 'ACTIVE') && (
                        <button
                          type="button"
                          onClick={() => { setActionDialog('verify'); setActionReason('Identity verification validated'); }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Verify Account
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('actions')}
                        className="px-3.5 py-1.5 rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 text-xs font-bold transition cursor-pointer"
                      >
                        All Controls
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: APPLICATIONS OR SCHOLARSHIPS */}
              {activeTab === 'submissions' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">
                    {isStudent ? `Submitted Scholarship Applications (${applications.length})` : `Managed Scholarship Programs (${managedScholarships.length})`}
                  </h4>
                  {isStudent ? (
                    applications.length === 0 ? (
                      <p className="text-xs text-slate-400">No applications submitted by this student yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {applications.map((app) => (
                          <div key={app.id} className="p-3.5 rounded-2xl border text-xs flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                            <div>
                              <p className="font-bold text-white">{app.scholarship_title || `Scholarship #${app.scholarship_id}`}</p>
                              <p className="text-[11px] text-slate-400">Applied: {new Date(app.applied_at || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-white border border-white/20">
                              {app.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    managedScholarships.length === 0 ? (
                      <p className="text-xs text-slate-400">No scholarships published by this organization yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {managedScholarships.map((sch) => (
                          <div key={sch.id} className="p-3.5 rounded-2xl border text-xs flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                            <div>
                              <p className="font-bold text-white">{sch.title}</p>
                              <p className="text-[11px] text-slate-400">Slots: {sch.slots || 'N/A'} • Amount: ₱{sch.amount ? Number(sch.amount).toLocaleString() : 'N/A'}</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-white border border-white/20">
                              {sch.status || 'Active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* TAB 3: DOCUMENTS & OCR */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">
                      Verification Documents & OCR Extractions ({documents.length})
                    </h4>
                  </div>

                  {documents.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed text-center text-xs text-slate-400" style={{ borderColor: 'var(--border, #1f293d)' }}>
                      No verification documents uploaded for this account.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-4 rounded-2xl border flex flex-col justify-between space-y-3" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-white text-xs truncate">{doc.originalname || doc.filename}</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                {doc.status || 'SUBMITTED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Type: {doc.mimeType || doc.mimetype || 'Document'} • Size: {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'}
                            </p>
                            {doc.rawOcrText && (
                              <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono text-slate-300 line-clamp-3">
                                <strong>OCR:</strong> {doc.rawOcrText}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border, #1f293d)' }}>
                            <button
                              type="button"
                              onClick={() => loadDocumentPreview(doc)}
                              className="px-3 py-1.5 rounded-xl bg-[#FF6D29] text-white text-xs font-bold hover:bg-[#e05a1b] transition cursor-pointer flex items-center gap-1.5"
                            >
                              <DocumentIcon className="w-3.5 h-3.5" />
                              View Protected Preview
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SECURITY & ACTIONS */}
              {activeTab === 'actions' && (
                <div className="space-y-6">
                  <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">Administrative Account Lifecycle Controls</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Verify */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-bold text-white">Verify Account</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Validate submitted credential documents and mark account active.</p>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('verify'); setActionReason('Credentials verified by administrator'); }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Verify Account
                      </button>
                    </div>

                    {/* Reject */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <XIcon className="w-4 h-4 text-rose-400" />
                        <h5 className="text-xs font-bold text-white">Reject Account</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Deny registration due to invalid documents or unverified identity.</p>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('reject'); setActionReason(''); }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Reject Account
                      </button>
                    </div>

                    {/* Suspend */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="w-4 h-4 text-amber-400" />
                        <h5 className="text-xs font-bold text-white">Suspend Account</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Immediately revoke active sessions and block login access.</p>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('suspend'); setActionReason(''); }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Suspend Account
                      </button>
                    </div>

                    {/* Reactivate */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                        <h5 className="text-xs font-bold text-white">Reactivate Account</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Restore access for a currently suspended account.</p>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('reactivate'); setActionReason('Suspension lifted after review'); }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Reactivate
                      </button>
                    </div>

                    {/* Archive */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4 text-slate-400" />
                        <h5 className="text-xs font-bold text-white">Archive Account</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Preserve all records and audit trails while disabling account login.</p>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('archive'); setActionReason('Account archived for record retention'); }}
                        className="px-3 py-1.5 rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 text-xs font-bold transition cursor-pointer"
                      >
                        Archive Account
                      </button>
                    </div>

                    {/* Revoke Sessions */}
                    <div className="p-4 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                      <div className="flex items-center gap-2">
                        <LockIcon className="w-4 h-4 text-amber-400" />
                        <h5 className="text-xs font-bold text-white">Revoke Sessions</h5>
                      </div>
                      <p className="text-[11px] text-slate-400">Force immediate logout across all active student/provider devices.</p>
                      <button
                        type="button"
                        onClick={() => executeAction(`/api/admin/accounts/${acc.id}/revoke-sessions`, 'POST', { reason: 'Security session revocation' })}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Revoke Active Sessions
                      </button>
                    </div>
                  </div>

                  {/* Destructive Section */}
                  <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
                    <h5 className="text-xs font-black text-rose-400 uppercase">Destructive Operations</h5>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { setActionDialog('soft-delete'); setActionReason(''); }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Request Soft Deletion
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActionDialog('permanent-delete'); setActionReason(''); setConfirmTypedText(''); setActionMfaCode(''); }}
                        className="px-3.5 py-1.5 rounded-xl bg-red-800 hover:bg-red-900 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Permanent Deletion (MFA Required)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT & HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  {/* Version History */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">Profile Version History</h4>
                    {versionHistory.length === 0 ? (
                      <p className="text-xs text-slate-400">No profile versions logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {versionHistory.map((v, i) => (
                          <div key={i} className="p-3.5 rounded-xl border text-xs space-y-1" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">Version v{v.version || i + 1}</span>
                              <span className="text-[10px] text-slate-400">{new Date(v.timestamp || Date.now()).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-300"><strong className="text-white">Reason:</strong> {v.reason || 'Field update'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Ledger */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-[#FF6D29]">Immutable Audit Ledger Events</h4>
                    {auditHistory.length === 0 ? (
                      <p className="text-xs text-slate-400">No audit events recorded for this account yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {auditHistory.map((log) => (
                          <div key={log.id} className="p-3 rounded-xl border text-xs space-y-1" style={{ backgroundColor: 'var(--color-surface-panel, #121829)', borderColor: 'var(--border, #1f293d)' }}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#FF6D29]">{log.action}</span>
                              <span className="text-[10px] text-slate-400">{new Date(log.timestamp || Date.now()).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-300">{log.reason || 'Administrative action executed'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL ACTION DIALOGS (Confirmations, Reasons, MFA) */}
        <AnimatePresence>
          {actionDialog && (
            <div className="fixed inset-0 z-[1010] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4"
                style={{ backgroundColor: 'var(--color-bg-elevated, #0d121f)', borderColor: 'var(--border, #1f293d)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-black text-white capitalize">
                  {actionDialog === 'edit' ? 'Edit Allowlisted Account Fields' : `${actionDialog.replace('-', ' ')} Account Confirmation`}
                </h3>

                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
                    {actionError}
                  </div>
                )}
                {actionSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    {actionSuccess}
                  </div>
                )}

                {/* EDIT FORM DIALOG */}
                {actionDialog === 'edit' ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 text-xs">
                    <div>
                      <label className="font-bold text-slate-300">Full Name / Display Name</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-300">Phone Number</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                      />
                    </div>
                    {isStudent ? (
                      <>
                        <div>
                          <label className="font-bold text-slate-300">School / University</label>
                          <input
                            type="text"
                            value={editFormData.schoolName || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, schoolName: e.target.value })}
                            className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-300">Course</label>
                          <input
                            type="text"
                            value={editFormData.course || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                            className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-300">GPA</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editFormData.gpa ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, gpa: e.target.value ? Number(e.target.value) : '' })}
                            className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="font-bold text-slate-300">Company Name</label>
                          <input
                            type="text"
                            value={editFormData.company || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                            className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-300">Organization Website</label>
                          <input
                            type="text"
                            value={editFormData.organization_website || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, organization_website: e.target.value })}
                            className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="font-bold text-[#FF6D29]">Mandatory Reason for Administrative Edit (min 5 chars) *</label>
                      <input
                        type="text"
                        placeholder="e.g. Corrected spelling on official school record"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white border-[#FF6D29]/50 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : actionDialog === 'permanent-delete' ? (
                  /* PERMANENT DELETION FORM */
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] space-y-1">
                      <p><strong>Impact Summary:</strong> {applications.length} applications and {documents.length} documents will be anonymized to protect record integrity.</p>
                      <p>Type <strong>{acc.email}</strong> and enter your 6-digit Administrator MFA code to confirm.</p>
                    </div>

                    <div>
                      <label className="font-bold text-slate-300">Type Account Email to Confirm *</label>
                      <input
                        type="text"
                        placeholder={acc.email}
                        value={confirmTypedText}
                        onChange={(e) => setConfirmTypedText(e.target.value)}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300">6-Digit Administrator MFA Code *</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit MFA code"
                        value={actionMfaCode}
                        onChange={(e) => setActionMfaCode(e.target.value)}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white font-mono tracking-widest focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-300">Mandatory Deletion Reason *</label>
                      <input
                        type="text"
                        placeholder="e.g. Permanent GDPR erasure request verified"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full p-2 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* STANDARD ACTIONS */
                  <div className="space-y-3 text-xs">
                    <p className="text-slate-300">
                      Are you sure you want to <strong>{actionDialog.replace('-', ' ')}</strong> account <strong>{acc.name || acc.email}</strong>?
                    </p>
                    <div>
                      <label className="font-bold text-slate-300">Mandatory Reason (min 5 characters) *</label>
                      <input
                        type="text"
                        placeholder="Enter reason for audit trail..."
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full p-2.5 rounded-xl border mt-1 bg-black/40 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Dialog Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border, #1f293d)' }}>
                  <button
                    type="button"
                    onClick={() => setActionDialog(null)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading || !actionReason || actionReason.trim().length < 5 || (actionDialog === 'permanent-delete' && (!actionMfaCode || confirmTypedText !== acc.email))}
                    onClick={() => {
                      if (actionDialog === 'edit') {
                        executeAction(`/api/admin/accounts/${acc.id}`, 'PATCH', { reason: actionReason, ...editFormData })
                      } else if (actionDialog === 'permanent-delete') {
                        executeAction(`/api/admin/accounts/${acc.id}`, 'DELETE', { reason: actionReason, mfaCode: actionMfaCode })
                      } else if (actionDialog === 'soft-delete') {
                        executeAction(`/api/admin/accounts/${acc.id}/soft-delete`, 'POST', { reason: actionReason })
                      } else if (actionDialog === 'restore') {
                        executeAction(`/api/admin/accounts/${acc.id}/restore`, 'POST', { reason: actionReason })
                      } else {
                        executeAction(`/api/admin/accounts/${acc.id}/${actionDialog}`, 'PATCH', { reason: actionReason })
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-40 ${
                      actionDialog === 'permanent-delete'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : actionDialog === 'suspend' || actionDialog === 'reject'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-[#FF6D29] hover:bg-[#e05a1b] text-white'
                    }`}
                  >
                    {actionLoading
                      ? 'Executing...'
                      : actionDialog === 'permanent-delete'
                      ? 'Permanently Delete Eligible Account Data'
                      : 'Confirm & Execute'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DOCUMENT PREVIEW OVERLAY */}
        <AnimatePresence>
          {previewDoc && (
            <div className="fixed inset-0 z-[1020] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl max-h-[88vh] p-5 sm:p-6 rounded-3xl border shadow-2xl space-y-4 flex flex-col"
                style={{ backgroundColor: 'var(--color-bg-elevated, #0d121f)', borderColor: 'var(--border, #1f293d)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border, #1f293d)' }}>
                  <div>
                    <h3 className="text-sm font-black text-white">{previewDoc.originalname || previewDoc.filename}</h3>
                    <p className="text-[11px] text-slate-400">Type: {previewDoc.mimeType || previewDoc.mimetype || 'Document'} • Status: {previewDoc.status || 'SUBMITTED'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="px-3 py-1 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="flex-1 min-h-[300px] max-h-[460px] rounded-2xl border overflow-hidden flex items-center justify-center bg-black/60 relative" style={{ borderColor: 'var(--border, #1f293d)' }}>
                  {previewLoading ? (
                    <div className="p-8 text-center text-xs font-semibold text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#FF6D29] border-t-transparent mb-2" />
                      <p>Loading document preview…</p>
                    </div>
                  ) : previewError ? (
                    <div className="p-6 text-center space-y-3">
                      <AlertTriangleIcon className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs font-bold text-rose-400">{previewError}</p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadDocumentPreview(previewDoc)}
                          className="px-3 py-1.5 rounded-xl bg-[#FF6D29] text-white text-xs font-bold hover:bg-[#e05a1b] transition cursor-pointer"
                        >
                          Retry Loading
                        </button>
                        {previewBlobUrl && (
                          <a
                            href={previewBlobUrl}
                            download={previewDoc.originalname || previewDoc.filename || 'document'}
                            className="px-3 py-1.5 rounded-xl border border-white/20 text-white text-xs font-bold hover:bg-white/10 transition"
                          >
                            Download Authorized Copy
                          </a>
                        )}
                      </div>
                    </div>
                  ) : previewBlobUrl ? (
                    previewDoc.mimeType?.includes('pdf') || previewDoc.filename?.endsWith('.pdf') ? (
                      <iframe
                        src={previewBlobUrl}
                        className="w-full h-full border-0 min-h-[360px]"
                        title="Protected Document PDF Preview"
                      />
                    ) : (
                      <img
                        src={previewBlobUrl}
                        alt={previewDoc.originalname || 'Document Preview'}
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    )
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Preview unsupported for this file type.
                    </div>
                  )}
                </div>

                {previewBlobUrl && !previewLoading && (
                  <div className="flex items-center justify-end">
                    <a
                      href={previewBlobUrl}
                      download={previewDoc.originalname || previewDoc.filename || 'document'}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <DocumentIcon className="w-3.5 h-3.5 text-blue-400" />
                      Download Authorized Copy
                    </a>
                  </div>
                )}

                {previewDoc.rawOcrText && (
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-extrabold uppercase text-[#FF6D29]">OCR Extracted Text</h5>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">
                      {previewDoc.rawOcrText}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
