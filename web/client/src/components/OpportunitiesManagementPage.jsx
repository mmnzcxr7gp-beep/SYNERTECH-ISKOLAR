import React, { useEffect, useState } from 'react'

const formatDate = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const statusBadge = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'open') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
  if (normalized === 'closed') return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
  if (normalized === 'draft') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
  return 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'
}

export default function OpportunitiesManagementPage({ token, user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [opportunities, setOpportunities] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadOpportunities()
  }, [token])

  const loadOpportunities = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scholarship-opportunities/provider/list', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to load opportunities')
      }

      const data = await res.json()
      setOpportunities(data.opportunities || data.scholarships || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading opportunities:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedOpportunities = opportunities
    .filter((opp) => {
      if (statusFilter === 'all') return true
      return String(opp.status || '').toLowerCase() === statusFilter.toLowerCase()
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
      } else if (sortBy === 'deadline') {
        return new Date(a.applicationDeadline || a.deadline || 0) - new Date(b.applicationDeadline || b.deadline || 0)
      } else if (sortBy === 'applicants') {
        return (b.applicantsCount || 0) - (a.applicantsCount || 0)
      }
      return 0
    })

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedOpportunities.length / pageSize))
  const paginatedOpportunities = filteredAndSortedOpportunities.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleEdit = (opp) => {
    window.location.hash = `#admin/scholarships`
  }

  const handleDelete = async () => {
    if (!selectedOpportunity) return
    
    setIsDeleting(true)
    try {
      const oppId = selectedOpportunity._id || selectedOpportunity.id
      const res = await fetch(`/api/scholarship-opportunities/${oppId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to close opportunity')
      }

      await loadOpportunities()
      setShowModal(false)
      setSelectedOpportunity(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewApplicants = (opp) => {
    const oppId = opp._id || opp.id
    window.location.hash = isAdmin ? `#admin/applicants?scholarship=${oppId}` : `#providers/applicants?scholarship=${oppId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)] h-8 w-8"></div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Loading scholarship opportunities…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
              style={{
                backgroundColor: 'rgba(255, 109, 41, 0.10)',
                color: 'var(--primary)',
                borderColor: 'rgba(255, 109, 41, 0.25)'
              }}
            >
              Opportunity Suite
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
              Scholarship Opportunities
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
              Manage active listings, eligibility criteria, and applicant intake queues.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.hash = isAdmin ? '#admin/create' : '#providers/create'
            }}
            className="btn-primary px-6 py-2.5 text-xs font-extrabold shadow-md cursor-pointer self-start sm:self-auto"
          >
            + Create Opportunity
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs font-semibold text-rose-500">
          {error}
        </div>
      )}

      {/* Filters and Sort */}
      <div
        className="rounded-2xl border p-5"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-2 w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Active / Open</option>
              <option value="closed">Closed / Archived</option>
              <option value="draft">Drafts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-2 w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="deadline">Upcoming Deadline</option>
              <option value="applicants">Most Applicants</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Total Listings
            </label>
            <div
              className="mt-2 rounded-xl border px-4 py-2 text-xs font-bold flex items-center h-[38px]"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-heading)'
              }}
            >
              {filteredAndSortedOpportunities.length} Active Records
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities Table / Cards */}
      {filteredAndSortedOpportunities.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No opportunities found for the selected criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <table className="w-full text-left">
              <thead className="border-b" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Title</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Type</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Slots / Approved</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Applicants</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Deadline</th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {paginatedOpportunities.map((opp) => (
                  <tr
                    key={opp._id || opp.id}
                    className="transition hover:bg-[var(--bg-panel)]/50"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>{opp.title || opp.name}</p>
                        <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>{opp.description?.substring(0, 70)}...</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {opp.type || 'Scholarship'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadge(opp.status)}`}>
                        {opp.status || 'open'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {opp.approvedCount || 0} / {opp.totalSlots || opp.slots || '∞'}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold" style={{ color: 'var(--primary)' }}>
                      {opp.applicantsCount || 0}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(opp.applicationDeadline || opp.deadline)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewApplicants(opp)}
                          className="btn-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                        >
                          Applicants
                        </button>
                        <button
                          onClick={() => handleEdit(opp)}
                          className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
                        >
                          View / Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSortedOpportunities.length)} of {filteredAndSortedOpportunities.length} listings
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--bg-panel)]"
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
                        : 'hover:bg-[var(--bg-panel)]'
                    }`}
                    style={{
                      backgroundColor: currentPage === pageNum ? 'var(--primary)' : 'var(--bg-panel)',
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
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--bg-panel)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Close Confirmation Dialog */}
      {showModal && selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div
            className="rounded-3xl border p-6 shadow-2xl max-w-md w-full"
            style={{
              backgroundColor: 'var(--bg-modal)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Close Opportunity?</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to close "{selectedOpportunity.title}"? This will halt all incoming student submissions.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                {isDeleting ? 'Closing…' : 'Close Opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
