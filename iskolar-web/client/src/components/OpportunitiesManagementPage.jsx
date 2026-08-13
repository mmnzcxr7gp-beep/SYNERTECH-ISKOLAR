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
  if (normalized === 'open') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
  if (normalized === 'closed') return 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
  if (normalized === 'draft') return 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
  return 'bg-slate-800/60 text-slate-300 border border-slate-700/60'
}

export default function OpportunitiesManagementPage({ token }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [opportunities, setOpportunities] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      setOpportunities(data.opportunities || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading opportunities:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedOpportunities = opportunities
    .filter((opp) => statusFilter === 'all' || opp.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt) - new Date(a.createdAt)
      } else if (sortBy === 'deadline') {
        return new Date(a.applicationDeadline) - new Date(b.applicationDeadline)
      } else if (sortBy === 'applicants') {
        return b.applicantsCount - a.applicantsCount
      }
      return 0
    })

  const handleEdit = (opp) => {
    window.location.hash = `#providers/edit-opportunity/${opp._id}`
  }

  const handleDelete = async () => {
    if (!selectedOpportunity) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/scholarship-opportunities/${selectedOpportunity._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to close opportunity')
      }

      setOpportunities(opportunities.filter((opp) => opp._id !== selectedOpportunity._id))
      setShowModal(false)
      setSelectedOpportunity(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleViewApplicants = (opp) => {
    window.location.hash = `#providers/opportunity/${opp._id}/applicants`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400 h-8 w-8"></div>
          <p className="text-slate-400">Loading opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/95 p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Scholarship Opportunities</h1>
            <p className="mt-1 text-slate-400">Manage your posted opportunities</p>
          </div>
          <button
            onClick={() => {
              window.location.hash = '#providers/create-opportunity'
            }}
            className="btn-primary px-6 py-2"
          >
            + Create Opportunity
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Filters and Sort */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field mt-2"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
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
              <option value="deadline">Upcoming Deadline</option>
              <option value="applicants">Most Applicants</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Total Count</label>
            <div className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-lg font-semibold text-slate-200">
              {filteredAndSortedOpportunities.length} opportunities
            </div>
          </div>
        </div>

        {/* Opportunities Table */}
        {filteredAndSortedOpportunities.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
            <p className="text-slate-400">No opportunities found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-900/50">
            <table className="w-full">
              <thead className="border-b border-slate-800/80 bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Slots / Approved</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Applicants</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Deadline</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedOpportunities.map((opp, idx) => (
                  <tr
                    key={opp._id}
                    className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{opp.title}</p>
                        <p className="text-xs text-slate-400">{opp.description?.substring(0, 50)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{opp.type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadge(opp.status)}`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {opp.approvedCount || 0} / {opp.totalSlots}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">
                      {opp.applicantsCount || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(opp.applicationDeadline)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewApplicants(opp)}
                        className="inline-block rounded px-2 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20"
                      >
                        View Applicants
                      </button>
                      <button
                        onClick={() => handleEdit(opp)}
                        className="ml-2 inline-block rounded px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Modal */}
        {showModal && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white">Close Opportunity?</h3>
              <p className="mt-2 text-slate-400">
                Are you sure you want to close "{selectedOpportunity.title}"?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-ghost px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn-primary px-4 py-2"
                >
                  {isDeleting ? 'Closing...' : 'Close Opportunity'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
