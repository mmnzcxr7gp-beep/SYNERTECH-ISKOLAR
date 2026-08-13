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
  if (normalized === 'approved') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
  if (normalized === 'rejected') return 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
  if (normalized === 'pending review') return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
  if (normalized === 'needs resubmission') return 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
  return 'bg-slate-800/60 text-slate-300 border border-slate-700/60'
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

      // Update local state
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
      setError('Rejection remarks are required')
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

      // Update local state
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
      setError('Resubmission remarks are required')
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

      // Update local state
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400 h-8 w-8"></div>
          <p className="text-slate-400">Loading applicants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/95 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                window.location.hash = '#providers/opportunities'
              }}
              className="text-sm text-cyan-400 hover:text-cyan-300 mb-3"
            >
              ← Back to Opportunities
            </button>
            <h1 className="text-3xl font-bold text-white">{opportunity?.title || 'Loading...'}</h1>
            <p className="mt-1 text-slate-400">Review and manage scholarship applications</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Stats */}
        {opportunity && (
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-800/50 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Total Applicants</p>
              <p className="mt-1 text-2xl font-bold text-white">{applications.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-emerald-400">Approved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {applications.filter((a) => a.status === 'Approved').length}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-amber-400">Pending Review</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">
                {applications.filter((a) => a.status === 'Pending Review').length}
              </p>
            </div>
            <div className="rounded-lg bg-rose-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-rose-400">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-rose-300">
                {applications.filter((a) => a.status === 'Rejected').length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field mt-2"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Needs Resubmission">Needs Resubmission</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field mt-2"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        {filteredAndSortedApps.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
            <p className="text-slate-400">No applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-900/50">
            <table className="w-full">
              <thead className="border-b border-slate-800/80 bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Applied</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Documents</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedApps.map((app, idx) => (
                  <tr
                    key={app._id}
                    className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'}
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      Student #{app.studentId}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {app.studentEmail || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {app.documents?.length || 0} files
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedApp(app)
                          setShowDetailModal(true)
                        }}
                        className="inline-block rounded px-3 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-lg">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Application Review</h2>
                  <p className="mt-1 text-slate-400">Student ID: {selectedApp.studentId}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedApp(null)
                    setRemarks('')
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Student Info */}
              <div className="mb-6 rounded-lg bg-slate-800/50 p-4">
                <h3 className="font-semibold text-white">Student Information</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Email:</span> {selectedApp.studentEmail || 'N/A'}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">School:</span> {selectedApp.studentSchool || 'N/A'}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Grade:</span> {selectedApp.studentGrade || 'N/A'}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Applied:</span> {formatDateTime(selectedApp.appliedAt)}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Current Status:</span>{' '}
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(selectedApp.status)}`}>
                      {selectedApp.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Documents */}
              {selectedApp.documents && selectedApp.documents.length > 0 && (
                <div className="mb-6 rounded-lg bg-slate-800/50 p-4">
                  <h3 className="font-semibold text-white">Uploaded Documents</h3>
                  <div className="mt-3 space-y-2">
                    {selectedApp.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-slate-700/30 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-200">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            Uploaded: {formatDateTime(doc.uploadedAt)}
                          </p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input-field mt-2 min-h-[100px] w-full"
                  placeholder="Add remarks for approval, rejection, or resubmission request..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={actionInProgress}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : '✓ Approve'}
                </button>
                <button
                  onClick={handleRequestResubmission}
                  disabled={actionInProgress}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : '! Resubmit'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionInProgress}
                  className="flex-1 rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionInProgress ? 'Processing...' : '✕ Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
