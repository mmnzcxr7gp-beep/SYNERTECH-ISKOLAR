import React, { useEffect, useState } from 'react'

const formatDate = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const statusBadge = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'approved') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
  if (normalized === 'rejected') return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
  if (normalized === 'pending review') return 'bg-[#FF6D29]/15 text-[#FF6D29] border border-[#FF6D29]/30'
  if (normalized === 'needs resubmission') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
  return 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'
}

export default function ApplicationReviewPage({ token, scholarshipId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applications, setApplications] = useState([])
  const [opportunity, setOpportunity] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [remarks, setRemarks] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    loadData()
  }, [token, scholarshipId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [opportunityRes, applicationsRes] = await Promise.all([
        fetch(`/api/scholarship-opportunities/${scholarshipId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/scholarship-applications/scholarship/${scholarshipId}/applicants`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!opportunityRes.ok || !applicationsRes.ok) {
        throw new Error('Failed to load data')
      }

      const oppData = await opportunityRes.json()
      const appData = await applicationsRes.json()

      setOpportunity(oppData.opportunity)
      setApplications(appData.applicants || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedApps = applications
    .filter((app) => statusFilter === 'all' || app.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.appliedAt) - new Date(a.appliedAt)
      } else if (sortBy === 'oldest') {
        return new Date(a.appliedAt) - new Date(b.appliedAt)
      }
      return 0
    })

  const handleApprove = async () => {
    if (!selectedApp) return

    setActionInProgress(true)
    try {
      const res = await fetch(
        `/api/scholarship-applications/${selectedApp._id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ remarks }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to approve application')
      }

      setApplications(
        applications.map((app) =>
          app._id === selectedApp._id
            ? { ...app, status: 'Approved', providerRemarks: remarks }
            : app
        )
      )
      setShowDetailModal(false)
      setSelectedApp(null)
      setRemarks('')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApp || !remarks.trim()) {
      setError('Rejection remarks are required before declining')
      return
    }

    setActionInProgress(true)
    try {
      const res = await fetch(
        `/api/scholarship-applications/${selectedApp._id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ remarks }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to reject application')
      }

      setApplications(
        applications.map((app) =>
          app._id === selectedApp._id
            ? { ...app, status: 'Rejected', providerRemarks: remarks }
            : app
        )
      )
      setShowDetailModal(false)
      setSelectedApp(null)
      setRemarks('')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleRequestResubmission = async () => {
    if (!selectedApp || !remarks.trim()) {
      setError('Resubmission instructions are required for student follow-up')
      return
    }

    setActionInProgress(true)
    try {
      const res = await fetch(
        `/api/scholarship-applications/${selectedApp._id}/request-resubmission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ remarks }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to request resubmission')
      }

      setApplications(
        applications.map((app) =>
          app._id === selectedApp._id
            ? { ...app, status: 'Needs Resubmission', providerRemarks: remarks }
            : app
        )
      )
      setShowDetailModal(false)
      setSelectedApp(null)
      setRemarks('')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)] h-8 w-8"></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading applicant records…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6 px-4">
      <div
        className="rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-modal)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Header */}
        <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => {
              window.location.hash = '#providers/opportunities'
            }}
            className="text-xs font-bold transition mb-3 inline-flex items-center gap-1"
            style={{ color: 'var(--primary)' }}
          >
            ← Back to Opportunities
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
            {opportunity?.title || 'Applicant Review Queue'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Examine applicant submissions, verify attached documentation, and record evaluation decisions.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-2xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        {/* Stats */}
        {opportunity && (
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Total Applicants</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{applications.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">Approved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {applications.filter((a) => a.status === 'Approved').length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FF6D29]/30 bg-[#FF6D29]/10 p-4">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--primary)' }}>Pending Review</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                {applications.filter((a) => a.status === 'Pending Review').length}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                {applications.filter((a) => a.status === 'Rejected').length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Needs Resubmission">Needs Resubmission</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        {filteredAndSortedApps.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No applicant submissions match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-left">
              <thead className="border-b" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Applicant ID</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Contact</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Applied Date</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Documents</th>
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredAndSortedApps.map((app) => (
                  <tr
                    key={app._id}
                    className="transition hover:bg-[var(--bg-panel)]"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                      Student #{app.studentId}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {app.studentEmail || 'N/A'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {app.documents?.length || 0} attached
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedApp(app)
                          setShowDetailModal(true)
                        }}
                        className="btn-primary px-3 py-1.5 text-xs font-bold"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Application Details Modal */}
        {showDetailModal && selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--bg-modal)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <div className="mb-6 flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Application Document Review</h2>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Student ID: #{selectedApp.studentId}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedApp(null)
                    setRemarks('')
                  }}
                  className="rounded-lg p-1.5 hover:bg-[var(--bg-panel)] transition text-sm font-bold"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Student Info */}
              <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--primary)' }}>Student Profile</h3>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Email:</span> {selectedApp.studentEmail || 'N/A'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>School:</span> {selectedApp.studentSchool || 'N/A'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Year / Grade:</span> {selectedApp.studentGrade || 'N/A'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Submission Date:</span> {formatDateTime(selectedApp.appliedAt)}
                  </p>
                </div>
              </div>

              {/* Documents */}
              {selectedApp.documents && selectedApp.documents.length > 0 && (
                <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--primary)' }}>Attached Verification Documents</h3>
                  <div className="space-y-2">
                    {selectedApp.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border p-3"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>{doc.fileName}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Uploaded: {formatDateTime(doc.uploadedAt)}
                          </p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold underline transition"
                          style={{ color: 'var(--primary)' }}
                        >
                          Preview File
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Reviewer Remarks / Feedback
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input-field w-full min-h-[90px] p-3 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Provide evaluation notes, reason for approval, rejection rationale, or resubmission instructions..."
                />
              </div>

              {/* Explicit Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={handleApprove}
                  disabled={actionInProgress}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing…' : '✓ Approve Application'}
                </button>
                <button
                  onClick={handleRequestResubmission}
                  disabled={actionInProgress}
                  className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing…' : '↻ Request Resubmission'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionInProgress}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing…' : '✕ Reject Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
