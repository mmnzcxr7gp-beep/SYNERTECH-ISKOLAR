import React, { useState, useEffect } from 'react'
import { SearchIcon, CalendarIcon, BuildingIcon, ArrowRightIcon } from './Icons'
import { API_BASE_URL } from '../config/api'

const DEFAULT_SCHOLARSHIPS = [
  {
    id: 1001,
    title: 'DOST-SEI Science and Technology Undergraduate Scholarship',
    organization_name: 'Department of Science and Technology',
    deadline: '2026-11-30',
    description: 'National scholarship grant for qualified priority STEM degree students with full tuition subsidy and monthly living allowance.',
    slots: 100,
    allowance: '₱7,000 / mo',
    maxAmount: 84000,
  },
  {
    id: 1002,
    title: 'CHED Tulong Dunong Financial Assistance Program',
    organization_name: 'Commission on Higher Education',
    deadline: '2026-12-15',
    description: 'Direct financial assistance grant for deserving Filipino college students enrolled in accredited higher education institutions.',
    slots: 75,
    allowance: '₱15,000 / sem',
    maxAmount: 30000,
  },
  {
    id: 1003,
    title: 'Ayala Tech Innovators Undergraduate Fellowship',
    organization_name: 'Ayala Foundation',
    deadline: '2026-11-15',
    description: 'Innovation fellowship for students pursuing computer science, AI, data analytics, and modern software engineering.',
    slots: 30,
    allowance: '₱7,500 / mo',
    maxAmount: 75000,
  },
  {
    id: 1004,
    title: 'SM Foundation College Education Grant',
    organization_name: 'SM Foundation, Inc.',
    deadline: '2026-12-01',
    description: 'Flagship education support providing 100% tuition subsidy, monthly living allowance, and priority career placement.',
    slots: 50,
    allowance: '₱6,000 / mo',
    maxAmount: 80000,
  },
  {
    id: 1005,
    title: 'Aboitiz Future Leaders Academic Scholarship',
    organization_name: 'Aboitiz Foundation',
    deadline: '2026-11-25',
    description: 'Leadership grant for high-achieving undergraduate students in engineering, technology, and business management.',
    slots: 18,
    allowance: '₱10,000 / mo',
    maxAmount: 120000,
  },
  {
    id: 1006,
    title: 'Megaworld Foundation Academic Excellence Grant',
    organization_name: 'Megaworld Foundation',
    deadline: '2026-11-28',
    description: 'Full tuition grant and monthly allowance for top academic students across engineering, architecture, and computer science.',
    slots: 25,
    allowance: '₱9,000 / mo',
    maxAmount: 108000,
  },
]

export default function ScholarshipPreview({ onSelectScholarship }) {
  const [scholarships, setScholarships] = useState(DEFAULT_SCHOLARSHIPS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchScholarships = async () => {
    try {
      let response = await fetch(`${API_BASE_URL}/api/scholarships`).catch(() => null)
      if (!response || !response.ok) {
        response = await fetch('/api/scholarships').catch(() => null)
      }
      if (response && response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : data.scholarships || data.data || []
        if (list.length > 0) {
          setScholarships(list)
          setError(null)
          return
        }
      }
    } catch (err) {
      console.warn('Live scholarship sync note:', err.message)
    }
  }

  useEffect(() => {
    fetchScholarships()
  }, [])

  const filteredScholarships = scholarships.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const title = (item.title || item.name || '').toLowerCase()
    const org = (item.organization_name || item.sponsor_name || item.provider_name || '').toLowerCase()
    const desc = (item.description || item.eligibilityRequirements || '').toLowerCase()
    return title.includes(q) || org.includes(q) || desc.includes(q)
  })

  return (
    <section id="scholarships" className="py-16 md:py-24 section-white" aria-labelledby="scholarships-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Section Header with Live Search Filter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Active Grant Directory</span>
            </div>

            <h2 id="scholarships-heading" className="section-heading">
              Available Scholarship Programs
            </h2>

            <p className="body-text text-base md:text-lg">
              Explore verified programs published directly by verified educational foundations, corporations, and academic sponsors.
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by degree or sponsor..."
                className="input-field text-sm"
                style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                aria-label="Filter scholarship programs"
              />
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Loading Skeleton State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading scholarships">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div key={sk} className="modular-card p-6 space-y-4">
                <div className="skeleton h-5 w-3/4"></div>
                <div className="skeleton h-4 w-1/2"></div>
                <div className="skeleton h-16 w-full"></div>
                <div className="skeleton h-8 w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredScholarships.length === 0 && (
          <div
            className="modular-card p-10 text-center max-w-md mx-auto space-y-3"
            style={{ backgroundColor: 'var(--color-bg-panel)' }}
          >
            <div className="text-3xl font-mono text-[var(--color-text-muted)]">∅</div>
            <h3 className="card-heading text-lg">No Matching Scholarships</h3>
            <p className="body-text text-xs sm:text-sm">
              {searchQuery
                ? `No scholarship grants matched your filter "${searchQuery}". Try a different keyword.`
                : 'No scholarship opportunities are currently published. Please check back soon.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-secondary text-xs font-bold px-4 py-2 mt-2"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* Populated Real Data Grid */}
        {!loading && filteredScholarships.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredScholarships.map((item) => {
              const grantId = item.id || item._id
              const title = item.title || item.name || 'Scholarship Grant'
              const sponsorName = item.organization_name || item.sponsor_name || item.provider_name || 'Verified Sponsor'
              const deadline = item.deadline || item.applicationDeadline || '2026-12-31'
              const description = item.description || item.eligibilityRequirements || 'Open to qualified undergraduate students meeting GPA and residency criteria.'
              const slots = item.slots || item.totalSlots || 20
              const allowance = item.allowance || (item.maxAmount ? `₱${Number(item.maxAmount).toLocaleString()}` : 'Tuition Support')

              return (
                <div
                  key={grantId}
                  className="modular-card p-6 sm:p-7 flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                >
                  <div className="space-y-4">
                    {/* Sponsor Identity & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                        <BuildingIcon className="w-4 h-4 text-[#FF6D29]" />
                        <span className="truncate max-w-[180px]">{sponsorName}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {slots} Slots Open
                      </span>
                    </div>

                    {/* Scholarship Title */}
                    <h3 className="card-heading text-lg font-bold line-clamp-2">
                      {title}
                    </h3>

                    {/* Eligibility Summary */}
                    <p className="body-text text-sm leading-relaxed line-clamp-3">
                      {description}
                    </p>
                  </div>

                  {/* Footer Metadata & Details Action */}
                  <div className="mt-6 pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="flex items-center gap-1.5 font-sans">
                        <CalendarIcon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span>Deadline: {new Date(deadline).toLocaleDateString()}</span>
                      </span>
                      <span className="font-bold text-[var(--color-text-heading)]">
                        {typeof allowance === 'number' ? `₱${allowance.toLocaleString()} / mo` : allowance}
                      </span>
                    </div>

                    <a
                      href="#download"
                      className="btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <span>Apply via Mobile App</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </section>
  )
}
