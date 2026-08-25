import React, { useState, useEffect } from 'react'
import ToastMessage from './ToastMessage'
import ConfirmationDialog from './ConfirmationDialog'
import SpotlightCard from './SpotlightCard'
import ShinyButton from './ShinyButton'
import {
  DocumentIcon,
  CalendarIcon,
  CheckCircleIcon,
  EyeIcon,
  EditIcon,
  ExternalLinkIcon,
  XIcon
} from './Icons'

export default function ScholarshipsPage({ token, user }) {
  const [scholarships, setScholarships] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, open, closed
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [selectedScholarshipDetail, setSelectedScholarshipDetail] = useState(null)
  const [confirmationConfig, setConfirmationConfig] = useState(null)

  const userRole = (user?.role || 'provider').toLowerCase()
  const isProvider = userRole === 'provider' || userRole === 'sponsor'
  const isAdmin = userRole === 'admin' || userRole === 'administrator'

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [scholarshipsRes, applicationsRes] = await Promise.all([
        fetch('/api/scholarships', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ])

      if (scholarshipsRes && scholarshipsRes.ok) {
        const body = await scholarshipsRes.json()
        setScholarships(body.scholarships || [])
      }

      if (applicationsRes && applicationsRes.ok) {
        const body = await applicationsRes.json()
        setApplications(body.applications || [])
      }
    } catch (err) {
      console.error('Failed to load scholarships:', err)
      showToast('Network error loading scholarships', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  let baseScholarships = []
  if (isProvider) {
    baseScholarships = scholarships.filter((item) => Number(item.sponsor_id ?? item.provider_id) === Number(user?.id))
  } else {
    baseScholarships = scholarships
  }

  const getApplicationCount = (scholarshipId) => {
    return applications.filter((app) => String(app.scholarship_id || app.scholarshipId || app.scholarship?.id) === String(scholarshipId)).length
  }

  let filtered = [...baseScholarships].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.created_at || 0)
    const bDate = new Date(b.createdAt || b.created_at || 0)
    return bDate - aDate
  })

  if (filter === 'open') {
    filtered = filtered.filter((s) => String(s.status || '').toLowerCase() === 'open')
  } else if (filter === 'closed') {
    filtered = filtered.filter((s) => String(s.status || '').toLowerCase() !== 'open')
  }

  if (searchQuery) {
    filtered = filtered.filter((s) =>
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedScholarships = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleToggleStatus = async (scholarship, newStatus) => {
    try {
      const id = scholarship.id || scholarship._id
      const endpoint = isAdmin ? `/api/admin/scholarships/${id}/status` : `/api/scholarships/${id}`
      const method = isAdmin ? 'PUT' : 'PUT'
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Status update failed')
      showToast(`Scholarship marked as ${newStatus.toUpperCase()}`, 'success')
      setSelectedScholarshipDetail(null)
      setConfirmationConfig(null)
      loadData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            {isProvider ? 'Provider Management' : 'System Administration'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            {isProvider ? 'Scholarship Program Directory' : 'All System Scholarships'}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isProvider
              ? 'Post new scholarship grant offerings, manage criteria, inspect details, and evaluate candidate pools.'
              : 'System-wide scholarship programs, criteria audits, and provider monitoring.'}
          </p>
        </div>

        <button
          onClick={() => { window.location.hash = isProvider ? '#providers/create' : '#admin/create' }}
          className="btn-primary py-2.5 px-5 text-xs font-extrabold shadow-md cursor-pointer self-start sm:self-auto"
        >
          + Post New Scholarship
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 w-full">
          <input
            type="search"
            placeholder="Search programs by title, description, or requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full px-4 py-3 text-xs sm:text-sm focus:outline-none"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: `All (${baseScholarships.length})` },
            { value: 'open', label: `Active (${baseScholarships.filter(s => String(s.status || '').toLowerCase() === 'open').length})` },
            { value: 'closed', label: `Closed / Draft (${baseScholarships.filter(s => String(s.status || '').toLowerCase() !== 'open').length})` },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition border cursor-pointer ${
                filter === option.value
                  ? 'bg-gradient-to-r from-[#FF6D29] to-[#FF8552] text-white border-[#FF6D29] shadow-sm'
                  : 'hover:bg-[var(--color-surface-panel)]'
              }`}
              style={{
                backgroundColor: filter === option.value ? 'var(--primary)' : 'var(--color-surface-panel)',
                borderColor: filter === option.value ? 'var(--primary)' : 'var(--border)',
                color: filter === option.value ? '#FFFFFF' : 'var(--text-secondary)'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scholarship Cards Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-56 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <SpotlightCard className="py-16 text-center p-8 border">
          <div className="text-3xl mb-3 text-[#FF6D29]">✦</div>
          <h3 className="text-lg font-black mb-1" style={{ color: 'var(--text-heading)' }}>No scholarships found</h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            No grants match your current filter or search criteria. Create a new scholarship using the button above.
          </p>
        </SpotlightCard>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedScholarships.map((item) => {
              const appCount = getApplicationCount(item.id || item._id)
              const isOpen = String(item.status || '').toLowerCase() === 'open'
              const itemId = item.id || item._id

              return (
                <SpotlightCard
                  key={itemId}
                  className="p-6 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isOpen
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-[var(--color-surface-panel)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}>
                        {item.status || 'open'}
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        Slots: <strong style={{ color: 'var(--text-heading)' }}>{item.totalSlots || item.slots || 10}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-black leading-snug tracking-tight" style={{ color: 'var(--text-heading)' }}>
                      {item.title}
                    </h3>
                    <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.description}
                    </p>

                    {item.sponsor_name && (
                      <div className="text-xs font-bold flex items-center gap-1.5 text-[#FF6D29]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6D29]"></span>
                        <span>Sponsor: {item.sponsor_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t mt-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Deadline:</span>
                      <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
                        {item.applicationDeadline ? item.applicationDeadline.slice(0, 10) : item.deadline || 'Ongoing'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedScholarshipDetail(item)}
                        className="btn-secondary flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Preview Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { window.location.hash = isProvider ? `#providers/applicants?scholarship=${itemId}` : `#admin/applicants?scholarship=${itemId}` }}
                        className="btn-primary flex-1 py-1.5 text-xs font-extrabold cursor-pointer"
                      >
                        Candidates ({appCount})
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} grants
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--color-surface-panel)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-[#FF6D29] to-[#FF8552] text-white border-[#FF6D29] shadow-sm'
                        : 'hover:bg-[var(--color-surface-panel)]'
                    }`}
                    style={{
                      backgroundColor: currentPage === pageNum ? 'var(--primary)' : 'var(--color-surface-panel)',
                      borderColor: currentPage === pageNum ? 'var(--primary)' : 'var(--border)',
                      color: currentPage === pageNum ? '#FFFFFF' : 'var(--text-secondary)'
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--color-surface-panel)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* SHARED SCHOLARSHIP DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedScholarshipDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Scholarship Details Modal"
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  String(selectedScholarshipDetail.status).toLowerCase() === 'open'
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                }`}>
                  Status: {selectedScholarshipDetail.status || 'open'}
                </span>
                <h2 className="text-xl font-black mt-2 tracking-tight" style={{ color: 'var(--text-heading)' }}>
                  {selectedScholarshipDetail.title}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Program Ref ID: #{selectedScholarshipDetail.id || selectedScholarshipDetail._id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedScholarshipDetail(null)}
                className="p-1.5 rounded-xl text-xs font-bold border hover:bg-[var(--color-surface-panel)] cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                aria-label="Close scholarship details modal"
              >
                ✕ Close
              </button>
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Program Overview
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {selectedScholarshipDetail.description}
              </p>
            </div>

            {/* Benefits & Eligibility */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <p className="font-bold text-[#FF6D29] uppercase tracking-wider text-[10px] mb-1">Scholar Benefits</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedScholarshipDetail.benefits || 'Full tuition subsidy & monthly living allowance.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <p className="font-bold text-[#FF6D29] uppercase tracking-wider text-[10px] mb-1">Eligibility Criteria</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedScholarshipDetail.eligibilityRequirements || 'Minimum 85% GPA, enrolled undergraduate student.'}
                </p>
              </div>
            </div>

            {/* Key Program Facts */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-2xl border bg-[var(--bg-input)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Slots Available</p>
                <p className="font-black text-sm mt-0.5" style={{ color: 'var(--text-heading)' }}>
                  {selectedScholarshipDetail.totalSlots || selectedScholarshipDetail.slots || 10}
                </p>
              </div>
              <div className="p-3 rounded-2xl border bg-[var(--bg-input)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                <p className="font-black text-xs mt-0.5 truncate" style={{ color: 'var(--text-heading)' }}>
                  {selectedScholarshipDetail.applicationDeadline ? selectedScholarshipDetail.applicationDeadline.slice(0, 10) : selectedScholarshipDetail.deadline || 'Ongoing'}
                </p>
              </div>
              <div className="p-3 rounded-2xl border bg-[var(--bg-input)]" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Allowance / Sem</p>
                <p className="font-black text-xs mt-0.5 text-emerald-500">
                  ₱{(selectedScholarshipDetail.allowance || selectedScholarshipDetail.maxAmount || 25000).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Provider Actions (Notice: Strictly NO Student Apply Button) */}
            <div className="pt-4 border-t flex flex-wrap gap-2.5 justify-end" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedScholarshipDetail(null)}
                className="btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Close View
              </button>

              <button
                type="button"
                onClick={() => {
                  const sId = selectedScholarshipDetail.id || selectedScholarshipDetail._id
                  window.location.hash = isProvider ? `#providers/edit/${sId}` : `#admin/edit/${sId}`
                  setSelectedScholarshipDetail(null)
                }}
                className="btn-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <EditIcon className="w-3.5 h-3.5" />
                <span>Edit Grant</span>
              </button>

              {String(selectedScholarshipDetail.status).toLowerCase() === 'open' ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationConfig({
                      title: 'Close Scholarship Intake?',
                      message: `Are you sure you want to close applications for "${selectedScholarshipDetail.title}"? Students will no longer be able to submit new applications.`,
                      confirmText: 'Yes, Close Intake',
                      isDestructive: true,
                      onConfirm: () => handleToggleStatus(selectedScholarshipDetail, 'closed')
                    })
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Close Applications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedScholarshipDetail, 'open')}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Publish & Reopen Intake
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationConfig && (
        <ConfirmationDialog
          open={Boolean(confirmationConfig)}
          title={confirmationConfig.title}
          message={confirmationConfig.message}
          confirmText={confirmationConfig.confirmText}
          isDestructive={confirmationConfig.isDestructive}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={() => setConfirmationConfig(null)}
        />
      )}

      {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
