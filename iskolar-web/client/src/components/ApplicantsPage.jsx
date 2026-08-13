import React, { useEffect, useMemo, useState } from 'react'
import { downloadAuthenticatedDocument } from '../utils/documentDownload'

const navItems = [
  { label: 'Dashboard', icon: '✦', route: 'providers' },
  { label: 'Scholarships', icon: '❖', route: 'providers/scholarships' },
  { label: 'Applicants', icon: '◈', route: 'providers/applicants' },
  { label: 'Reports', icon: '◈', route: 'providers/reports' },
  { label: 'Settings', icon: '◇', route: 'providers/settings' },
]

const statusBadge = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'approved') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
  if (normalized === 'rejected') return 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
  if (normalized === 'pending') return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
  return 'bg-slate-800/60 text-slate-300 border border-slate-700/60'
}

const getDocumentType = (doc) => {
  const name = String(doc.originalname || doc.filename || '')
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(name)) return 'image'
  if (/\.(pdf)$/i.test(name)) return 'pdf'
  return 'file'
}

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

export default function ApplicantsPage({ token }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applications, setApplications] = useState([])
  const [scholarships, setScholarships] = useState([])
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scholarshipFilter, setScholarshipFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [actionToConfirm, setActionToConfirm] = useState(null)
  const [previewDocument, setPreviewDocument] = useState(null)
  const [downloadingDocId, setDownloadingDocId] = useState(null)
  const [debugInfo, setDebugInfo] = useState('Waiting for interaction...')
  const [lastClickedButton, setLastClickedButton] = useState(null)

  // Debug handler
  const handleButtonClick = (buttonName) => {
    console.log('Button clicked:', buttonName)
    setDebugInfo(`✓ Button clicked: ${buttonName} at ${new Date().toLocaleTimeString()}`)
    setLastClickedButton(buttonName)
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [applicationsRes, scholarshipsRes] = await Promise.all([
          fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/scholarships', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (!applicationsRes.ok) throw new Error('Failed to load applications')
        if (!scholarshipsRes.ok) throw new Error('Failed to load scholarships')

        const applicationsBody = await applicationsRes.json()
        const scholarshipsBody = await scholarshipsRes.json()

        setApplications(applicationsBody.applications || [])
        setScholarships(scholarshipsBody.scholarships || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const updateStatus = async (id, status) => {
    try {
      const applicationId = id || actionToConfirm?.application?.id || actionToConfirm?.application?._id || selectedApplicant?.id || selectedApplicant?._id
      
      console.log('=== UPDATE STATUS DEBUG ===')
      console.log('Application ID:', applicationId)
      console.log('Status being sent:', status)
      console.log('Full actionToConfirm:', actionToConfirm)
      console.log('Full selectedApplicant:', selectedApplicant)
      
      if (!applicationId) {
        throw new Error('No application ID found. Cannot update status.')
      }
      
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      
      console.log('Response status:', res.status)
      console.log('Response ok:', res.ok)
      
      if (!res.ok) {
        const errorBody = await res.text()
        console.log('Error response body:', errorBody)
        throw new Error(`Server error: ${res.status} - ${errorBody}`)
      }
      
      const body = await res.json()
      console.log('Success response:', body)
      
      if (!body.application) {
        throw new Error('Invalid response: no application data returned')
      }
      
      const updatedId = body.application.id || body.application._id
      console.log('Updated ID:', updatedId)
      
      setApplications((prev) => prev.map((a) => (a.id === updatedId || a._id === updatedId ? body.application : a)))
      if (selectedApplicant && (selectedApplicant.id === updatedId || selectedApplicant._id === updatedId)) {
        setSelectedApplicant(body.application)
      }
      setActionToConfirm(null)
      
      setDebugInfo(`✓ Status updated to "${status}" successfully!`)
      alert(`Application ${status}!`)
    } catch (err) {
      console.error('Status update error:', err)
      setDebugInfo(`✗ Error: ${err.message}`)
      alert(`Error updating status: ${err.message}`)
    }
  }

  const filteredApplications = useMemo(() => {
    return applications
      .filter((application) => {
        const matchesSearch = searchQuery
          ? `${application.student_name || ''} ${application.student_email || ''} ${application.scholarship_title || ''}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true

        const matchesStatus =
          statusFilter === 'all' ? true : String(application.status || '').toLowerCase() === statusFilter

        const scholarshipId = String(application.scholarship_id || application.scholarshipId || application.scholarship?.id || '')
        const matchesScholarship = scholarshipFilter === 'all' ? true : scholarshipId === scholarshipFilter

        const submittedAt = application.applied_at || application.created_at || application.updated_at
        const submittedDate = submittedAt ? new Date(submittedAt) : null
        const afterFrom = dateFrom && submittedDate ? submittedDate >= new Date(`${dateFrom}T00:00:00`) : true
        const beforeTo = dateTo && submittedDate ? submittedDate <= new Date(`${dateTo}T23:59:59.999`) : true

        return matchesSearch && matchesStatus && matchesScholarship && afterFrom && beforeTo
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.applied_at || b.created_at).getTime() - new Date(a.applied_at || a.created_at).getTime()
        }
        if (sortBy === 'oldest') {
          return new Date(a.applied_at || a.created_at).getTime() - new Date(b.applied_at || b.created_at).getTime()
        }
        if (sortBy === 'name') {
          return String(a.student_name || '').localeCompare(String(b.student_name || ''))
        }
        if (sortBy === 'status') {
          return String(a.status || '').localeCompare(String(b.status || ''))
        }
        return 0
      })
  }, [applications, searchQuery, statusFilter, scholarshipFilter, dateFrom, dateTo, sortBy])

  const statistics = useMemo(() => {
    const total = applications.length
    const pending = applications.filter((a) => String(a.status || '').toLowerCase() === 'pending').length
    const approved = applications.filter((a) => String(a.status || '').toLowerCase() === 'approved').length
    const rejected = applications.filter((a) => String(a.status || '').toLowerCase() === 'rejected').length
    return { total, pending, approved, rejected }
  }, [applications])

  const scholarshipOptions = useMemo(() => {
    const map = {}
    scholarships.forEach((scholarship) => {
      const id = String(scholarship.id || scholarship._id || '')
      if (id) {
        map[id] = scholarship.title || 'Untitled scholarship'
      }
    })
    return map
  }, [scholarships])

  const recentActivity = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.applied_at || b.updated_at || b.created_at).getTime() - new Date(a.applied_at || a.updated_at || a.created_at).getTime())
      .slice(0, 6)
  }, [applications])

  const activeRoute = typeof window !== 'undefined' ? window.location.hash.replace('#', '') || 'providers' : 'providers'

  const previewModal = previewDocument ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/95 shadow-2xl shadow-slate-950/40">
        <button
          type="button"
          onClick={() => setPreviewDocument(null)}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/90 text-slate-100 shadow-lg shadow-slate-900/40 transition hover:bg-slate-900"
          aria-label="Close preview"
        >
          ✕
        </button>
        <div className="bg-slate-950/90 p-5 text-slate-300">
          <p className="text-sm text-slate-400">{previewDocument.requirement_name || previewDocument.originalname || 'Document preview'}</p>
        </div>
        <div className="bg-slate-950/80 p-4">
          <img
            src={previewDocument.url}
            alt={previewDocument.originalname || 'Uploaded document'}
            className="mx-auto max-h-[70vh] w-full rounded-3xl object-contain"
          />
        </div>
      </div>
    </div>
  ) : null

  const [requestMessage, setRequestMessage] = useState('')
  const [requestDocs, setRequestDocs] = useState('')
  const [requestSaving, setRequestSaving] = useState(false)

  const requestAdditionalDocuments = async (id) => {
    if (requestSaving) return

    const message = String(requestMessage || '').trim()
    const documents = String(requestDocs || '').trim()

    // Minimal validation; backend may allow empty.
    if (!documents) {
      alert('Please enter the additional documents you are requesting.')
      return
    }

    try {
      setRequestSaving(true)
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'pending additional documents',
          request: {
            message,
            documents,
          },
        }),
      })

      if (!res.ok) throw new Error('Unable to request additional documents')
      const body = await res.json()

      setApplications((prev) => prev.map((a) => (a.id === body.application.id ? body.application : a)))
      if (selectedApplicant?.id === body.application.id) {
        setSelectedApplicant(body.application)
      }

      setActionToConfirm(null)
      setRequestMessage('')
      setRequestDocs('')

      alert('Request sent successfully.')
    } catch (err) {
      alert(err.message)
    } finally {
      setRequestSaving(false)
    }
  }

  const actionModal = actionToConfirm ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm action"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-800/90 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        {actionToConfirm.type === 'request' ? (
          <>
            <h3 className="text-xl font-semibold text-white">Request additional documents</h3>
            <p className="mt-3 text-slate-400">
              Enter the required documents and a short message to the student.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Requested documents</span>
                <textarea
                  value={requestDocs}
                  onChange={(e) => setRequestDocs(e.target.value)}
                  rows={4}
                  placeholder="e.g., Transcript of Records (latest), Proof of Enrollment"
                  className="mt-2 w-full rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-200">Message (optional)</span>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                  placeholder="Add any clarification for the student"
                  className="mt-2 w-full rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActionToConfirm(null)}
                disabled={requestSaving}
                className="rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/90 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  console.debug('Request docs confirm clicked')
                  requestAdditionalDocuments(actionToConfirm.application.id)
                }}
                disabled={requestSaving}
                className={"rounded-2xl px-4 py-3 text-sm font-semibold text-white " + (requestSaving ? 'bg-cyan-400/50' : 'bg-cyan-500 hover:bg-cyan-400') + " transition disabled:opacity-50"}
              >
                {requestSaving ? 'Saving...' : 'Send Request'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-white">
              {actionToConfirm.type === 'approve'
                ? 'Confirm approval'
                : actionToConfirm.type === 'reject'
                ? 'Confirm rejection'
                : 'Request additional documents'}
            </h3>
            <p className="mt-3 text-slate-400">
              {actionToConfirm.type === 'approve' && 'Approve this application and update its status to approved.'}
              {actionToConfirm.type === 'reject' && 'Reject this application and update its status to rejected.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActionToConfirm(null)}
                className="rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/90 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  console.debug('Confirm action clicked', actionToConfirm.type)
                  const statusToSet = actionToConfirm.type === 'approve' ? 'approved' : 'rejected'
                  console.log('Calling updateStatus with:')
                  console.log('- Application ID:', actionToConfirm.application.id)
                  console.log('- Status:', statusToSet)
                  updateStatus(actionToConfirm.application.id, statusToSet)
                }}
                className={"rounded-2xl px-4 py-3 text-sm font-semibold text-white " + (actionToConfirm.type === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400') + " transition"}
              >
                {actionToConfirm.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-300">Loading applicants…</div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12 text-rose-300">{error}</div>
    )
  }

  return (
    <>
      <div className="w-full text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl">
        <div className="px-0 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Applicants</h1>
            <p className="mt-1 text-slate-400">Review and manage scholarship applications.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicants"
              className="min-w-[220px] rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="under review">Under Review</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-slate-100"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Student name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </header>

      <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur transition-shadow hover:shadow-lg hover:shadow-cyan-500/10">
              <p className="text-sm font-medium text-slate-400">Total Applications</p>
              <p className="mt-4 text-3xl font-semibold text-white">{statistics.total}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur transition-shadow hover:shadow-lg hover:shadow-amber-500/10">
              <p className="text-sm font-medium text-slate-400">Pending Review</p>
              <p className="mt-4 text-3xl font-semibold text-amber-300">{statistics.pending}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur transition-shadow hover:shadow-lg hover:shadow-emerald-500/10">
              <p className="text-sm font-medium text-slate-400">Approved</p>
              <p className="mt-4 text-3xl font-semibold text-emerald-300">{statistics.approved}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur transition-shadow hover:shadow-lg hover:shadow-rose-500/10">
              <p className="text-sm font-medium text-slate-400">Rejected</p>
              <p className="mt-4 text-3xl font-semibold text-rose-300">{statistics.rejected}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm text-slate-400">Scholarship</span>
                  <select
                    value={scholarshipFilter}
                    onChange={(e) => setScholarshipFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-slate-100"
                  >
                    <option value="all">All scholarships</option>
                    {Object.entries(scholarshipOptions).map(([id, title]) => (
                      <option key={id} value={id}>{title}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-400">Date from</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-slate-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-400">Date to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/80 px-4 py-3 text-slate-100"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setScholarshipFilter('all')
                      setDateFrom('')
                      setDateTo('')
                      setSortBy('newest')
                    }}
                    className="w-full rounded-2xl border border-slate-800/70 bg-slate-800/70 px-4 py-3 text-slate-100 hover:bg-slate-700/80 transition"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Applications</h2>
                  <p className="text-sm text-slate-400">Modern cards for each applicant, plus quick actions and status badges.</p>
                </div>
                <div className="text-sm text-slate-400">{filteredApplications.length} applications</div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 text-center text-slate-400">
                  No applications match this filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((application) => (
                    <article
                      key={application.id}
                      className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm shadow-slate-950/10 transition hover:border-cyan-500/30 hover:bg-slate-900/80"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-400 uppercase tracking-[0.2em]">{application.scholarship_title || 'Scholarship application'}</p>
                          <h3 className="mt-2 text-xl font-semibold text-white truncate">{application.student_name || application.student_email || `Student #${application.student_id}` || 'Untitled applicant'}</h3>
                          <p className="mt-2 text-sm text-slate-400">Applied on {formatDate(application.applied_at || application.created_at)}</p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <span className={"inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " + statusBadge(application.status)}>
                            {application.status || 'Pending'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedApplicant(application)}
                            className="rounded-full border border-slate-700/70 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900/90 transition"
                          >
                            View profile
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedApplicant(application)}
                            className="rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition"
                          >
                            Review application
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">Details panel</h2>
                <p className="mt-2 text-sm text-slate-400">Select an applicant to preview profile, documents, and actions.</p>

                {selectedApplicant ? (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Student information</p>
                          <p className="mt-3 text-xl font-semibold text-white">{selectedApplicant.student_name || selectedApplicant.student_email}</p>
                          <p className="mt-1 text-sm text-slate-400">{selectedApplicant.student_email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedApplicant(null)}
                          className="rounded-full border border-slate-700/60 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/90 transition"
                        >
                          Close
                        </button>
                      </div>

                      <div className="mt-6 grid gap-3">
                        <div className="rounded-2xl bg-slate-900/70 p-4">
                          <p className="text-sm text-slate-400">School</p>
                          <p className="mt-1 font-medium text-white">{selectedApplicant.student_profile?.school || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/70 p-4">
                          <p className="text-sm text-slate-400">Course</p>
                          <p className="mt-1 font-medium text-white">{selectedApplicant.student_profile?.course || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/70 p-4">
                          <p className="text-sm text-slate-400">GPA</p>
                          <p className="mt-1 font-medium text-white">{selectedApplicant.student_profile?.gpa ?? 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-900/70 p-4">
                          <p className="text-sm text-slate-400">Status</p>
                          <p className="mt-1 font-medium text-white">{selectedApplicant.status || 'Pending'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Application information</p>
                      <div className="mt-4 space-y-3 text-slate-300">
                        <div>
                          <p className="text-sm text-slate-400">Scholarship</p>
                          <p className="font-medium text-white">{selectedApplicant.scholarship_title || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Submission date</p>
                          <p className="font-medium text-white">{formatDateTime(selectedApplicant.applied_at || selectedApplicant.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Uploaded documents</p>
                      <div className="mt-4 space-y-3">
                        {selectedApplicant.documents?.length ? (
                          selectedApplicant.documents.map((doc) => {
                            const type = getDocumentType(doc)
                            return (
                              <div key={doc.id || `${doc.originalname}-${doc.uploaded_at}`} className="rounded-2xl border border-slate-800/60 bg-slate-900/80 p-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-300">
                                      {type === 'image' ? '🖼️' : type === 'pdf' ? '📄' : '📁'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">{doc.requirement_name || doc.originalname || 'Document'}</p>
                                      <p className="text-xs text-slate-500 truncate">{formatDate(doc.uploaded_at)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       disabled={downloadingDocId === (doc.id || doc._id)}
                                       onClick={async () => {
                                         const docId = doc.id || doc._id;
                                         if (!docId) { alert('Document identifier is missing.'); return; }
                                         if (downloadingDocId) return;
                                         setDownloadingDocId(docId);
                                         const res = await downloadAuthenticatedDocument({
                                           docId,
                                           token,
                                           filename: doc.originalname || doc.filename || 'document.pdf',
                                           onPreview: (objectUrl) => {
                                             setPreviewDocument({ ...doc, url: objectUrl });
                                           },
                                         });
                                         setDownloadingDocId(null);
                                         if (!res.success) {
                                           alert(res.error);
                                         }
                                       }}
                                       className="rounded-full border border-slate-700/60 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/90 transition disabled:opacity-50"
                                     >
                                       {downloadingDocId === (doc.id || doc._id) ? 'Loading...' : 'Preview'}
                                     </button>
                                     <button
                                       type="button"
                                       disabled={downloadingDocId === (doc.id || doc._id)}
                                       onClick={async () => {
                                         const docId = doc.id || doc._id;
                                         if (!docId) { alert('Document identifier is missing.'); return; }
                                         if (downloadingDocId) return;
                                         setDownloadingDocId(docId);
                                         const res = await downloadAuthenticatedDocument({
                                           docId,
                                           token,
                                           filename: doc.originalname || doc.filename || 'document.pdf',
                                         });
                                         setDownloadingDocId(null);
                                         if (!res.success) {
                                           alert(res.error);
                                         }
                                       }}
                                       className="rounded-full bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition disabled:opacity-50"
                                     >
                                       {downloadingDocId === (doc.id || doc._id) ? 'Loading...' : 'Download'}
                                     </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Actions</p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log('Approve button clicked', e)
                            e.preventDefault()
                            e.stopPropagation()
                            handleButtonClick('Approve Application')
                            setActionToConfirm({ type: 'approve', application: selectedApplicant })
                          }}
                          onMouseDown={(e) => console.log('Approve button mousedown', e)}
                          onMouseUp={(e) => console.log('Approve button mouseup', e)}
                          className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition cursor-pointer pointer-events-auto active:scale-95"
                        >
                          Approve Application
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log('Reject button clicked', e)
                            e.preventDefault()
                            e.stopPropagation()
                            handleButtonClick('Reject Application')
                            setActionToConfirm({ type: 'reject', application: selectedApplicant })
                          }}
                          onMouseDown={(e) => console.log('Reject button mousedown', e)}
                          onMouseUp={(e) => console.log('Reject button mouseup', e)}
                          className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-400 transition cursor-pointer pointer-events-auto active:scale-95"
                        >
                          Reject Application
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log('Request docs button clicked', e)
                            e.preventDefault()
                            e.stopPropagation()
                            handleButtonClick('Request Additional Documents')
                            setActionToConfirm({ type: 'request', application: selectedApplicant })
                          }}
                          onMouseDown={(e) => console.log('Request docs button mousedown', e)}
                          onMouseUp={(e) => console.log('Request docs button mouseup', e)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-500/30 hover:bg-slate-900/90 transition cursor-pointer pointer-events-auto active:scale-95"
                        >
                          Request Additional Documents
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-800/70 bg-slate-950/80 p-6 text-slate-400">
                    Select an applicant card to view profile details, documents, and actions.
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">Recent activity</h2>
                <p className="mt-2 text-sm text-slate-400">Track the latest application events in a timeline view.</p>
                <div className="mt-6 space-y-5">
                  {recentActivity.length === 0 ? (
                    <div className="text-slate-400">No recent activity available.</div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <div key={`${activity.id}-${index}`} className="flex gap-3">
                        <div className="flex h-3 w-3 items-center justify-center">
                          <span className="block h-3 w-3 rounded-full bg-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{activity.student_name || activity.student_email || 'New applicant'}</p>
                          <p className="text-sm text-slate-400 truncate">
                            {activity.status === 'approved' && 'Application approved'}
                            {activity.status === 'rejected' && 'Application rejected'}
                            {activity.status === 'pending' && 'Application submitted'}
                            {activity.status === 'under review' && 'Application under review'}
                          </p>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500 mt-1">{formatDateTime(activity.applied_at || activity.updated_at || activity.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* Render modals */}
      {previewModal}
      {actionModal}

      {/* Floating Debug Panel */}
      <div className="fixed bottom-6 right-6 z-40 max-w-xs rounded-2xl border border-cyan-500/50 bg-slate-950/95 p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Debug Info</p>
            <p className="mt-2 text-sm text-slate-100">{debugInfo}</p>
            {lastClickedButton && (
              <p className="mt-2 text-xs text-cyan-300">Last action: {lastClickedButton}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Selected: {selectedApplicant ? selectedApplicant.student_name || 'Unknown' : 'None'}</p>
          </div>
          <button
            onClick={() => {
              setDebugInfo('Debug panel closed. Open browser console for more info.')
            }}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}

