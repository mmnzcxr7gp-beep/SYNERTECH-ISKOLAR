import React, { useState, useEffect } from 'react'
import ToastMessage from './ToastMessage'
import ConfirmationDialog from './ConfirmationDialog'

export default function ScholarshipsPage({ token, user }) {
  const [scholarships, setScholarships] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open') // all, open, closed
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [confirmScholarship, setConfirmScholarship] = useState(null)
  const [selectedScholarshipDetail, setSelectedScholarshipDetail] = useState(null)

  const userRole = (user?.role || 'student').toLowerCase()
  const isStudent = userRole === 'student' || userRole === 'applicant'
  const isProvider = userRole === 'provider' || userRole === 'sponsor'
  const isAdmin = userRole === 'admin'

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const loadData = async () => {
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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  // Filter scholarships based on user role
  let baseScholarships = []
  if (isStudent) {
    baseScholarships = scholarships.filter((s) => String(s.status || '').toLowerCase() === 'open')
  } else if (isProvider) {
    baseScholarships = scholarships.filter((item) => Number(item.sponsor_id ?? item.provider_id) === Number(user.id))
  } else {
    baseScholarships = scholarships
  }

  // Get application counts
  const getApplicationCount = (scholarshipId) => {
    return applications.filter((app) => String(app.scholarship_id || app.scholarshipId || app.scholarship?.id) === String(scholarshipId)).length
  }

  // Search & Filter
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
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="w-full container mx-auto px-4 md:px-8 py-6">
      {/* Top Header */}
      <div className="border-b border-slate-800/60 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white" style={{ color: 'var(--text-heading)' }}>
              {isStudent ? '✦ Browse Open Scholarships' : isProvider ? '❖ My Scholarship Programs' : '◈ All System Scholarships'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {isStudent
                ? 'Explore verified active scholarship grants and apply directly.'
                : isProvider
                ? 'Post new scholarship opportunities, manage applicant pools, and track awards.'
                : 'System-wide scholarship program management.'}
            </p>
          </div>

          {/* Only Providers & Admins can see the Create Scholarship button */}
          {!isStudent && (
            <button
              onClick={() => { window.location.hash = '#providers/create' }}
              className="btn-primary py-2.5 px-5 text-sm font-bold self-start sm:self-auto"
            >
              + Create Scholarship
            </button>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="space-y-6 mt-6">
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full flex gap-4">
            <input
              type="text"
              placeholder="Search scholarships by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open Grants' },
              { value: 'closed', label: 'Closed' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filter === option.value
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scholarship Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-semibold">Loading active scholarships...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center glass-card rounded-3xl p-8 border-slate-800">
            <div className="text-4xl mb-3 text-cyan-400">✦</div>
            <h3 className="text-xl font-bold text-white mb-1">No scholarships found</h3>
            <p className="text-sm text-slate-400">
              {isStudent ? 'Check back soon for new open scholarship grants!' : 'Create your first scholarship program using the button above.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const appCount = getApplicationCount(item.id)
              const isOpen = String(item.status || '').toLowerCase() === 'open'

              return (
                <div key={item.id} className="glass-card rounded-[2rem] p-6 flex flex-col justify-between border-slate-800 hover:border-cyan-500/40 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isOpen ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status || 'open'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Slots: <strong className="text-white">{item.slots || 10}</strong>
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug" style={{ color: 'var(--text-heading)' }}>
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    {item.sponsor_name && (
                      <div className="text-xs text-cyan-400 font-medium flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                        <span>Sponsor: {item.sponsor_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 border-t border-slate-800/80 mt-5 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Deadline: <span className="text-slate-200 font-semibold">{item.deadline || 'N/A'}</span>
                    </div>

                    {isStudent ? (
                      <button
                        onClick={() => setSelectedScholarshipDetail(item)}
                        className="px-4 py-2 rounded-xl text-xs font-extrabold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
                      >
                        Apply / View
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { window.location.hash = `#providers/applicants?scholarship=${item.id}` }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                        >
                          Applicants ({appCount})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scholarship Detail Modal for Students */}
      {selectedScholarshipDetail && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-[2rem] p-7 max-w-lg w-full border-slate-700 relative">
            <button
              onClick={() => setSelectedScholarshipDetail(null)}
              className="absolute right-6 top-6 text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-white mb-2">{selectedScholarshipDetail.title}</h3>
            <p className="text-sm text-slate-300 mb-4">{selectedScholarshipDetail.description}</p>
            
            <div className="space-y-2 text-xs text-slate-400 bg-slate-900/80 p-4 rounded-xl border border-slate-800 mb-6">
              <div><strong>Available Slots:</strong> {selectedScholarshipDetail.slots}</div>
              <div><strong>Application Deadline:</strong> {selectedScholarshipDetail.deadline}</div>
              {selectedScholarshipDetail.requirements && (
                <div>
                  <strong>Requirements:</strong>
                  <ul className="list-disc list-inside mt-1 text-slate-300">
                    {Array.isArray(selectedScholarshipDetail.requirements)
                      ? selectedScholarshipDetail.requirements.map((req, i) => <li key={i}>{req}</li>)
                      : <li>{String(selectedScholarshipDetail.requirements)}</li>}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert('Application submitted! Use the Iskolar Mobile app to upload supporting PDF/Image documents.')
                  setSelectedScholarshipDetail(null)
                }}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Submit Student Application
              </button>
              <button
                onClick={() => setSelectedScholarshipDetail(null)}
                className="btn-ghost py-2.5 px-4 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
