import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  SearchIcon,
  CalendarIcon,
  BuildingIcon,
  ArrowRightIcon,
  FilterIcon,
  RefreshIcon,
  AlertTriangleIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon
} from './Icons'
import { apiClient } from '../services/api'

// Isolated development fixtures: only loaded on explicit developer request in DEV mode
const DEV_SAMPLE_FIXTURES = [
  {
    id: 'dev-1001',
    title: 'DOST-SEI Science and Technology Undergraduate Scholarship',
    sponsor_name: 'Department of Science and Technology',
    deadline: '2026-11-30',
    description: 'National scholarship grant for qualified priority STEM degree students with full tuition subsidy and monthly living allowance.',
    eligibilityRequirements: 'Filipino citizen, top 5% of graduating class or STEM strand graduate, enrolling in DOST priority courses.',
    benefits: 'Full tuition subsidy, ₱7,000 monthly living allowance, book allowance, and graduation thesis grant.',
    requirements: ['Certificate of Grades / Form 137', 'Certificate of Registration', 'Parent BIR Tax Exemption or 2316 Certificate'],
    evaluationStages: ['Initial Academic Eligibility Screening', 'STEM Qualifying Examination', 'Final Award Certification'],
    slots: 100,
    type: 'merit',
    status: 'open',
    allowance: '₱7,000 / mo',
    maxAmount: 84000,
  },
  {
    id: 'dev-1002',
    title: 'CHED Tulong Dunong Financial Assistance Program',
    sponsor_name: 'Commission on Higher Education',
    deadline: '2026-12-15',
    description: 'Direct financial assistance grant for deserving Filipino college students enrolled in accredited higher education institutions.',
    eligibilityRequirements: 'Enrolled in an authorized HEI program with family annual gross income not exceeding ₱400,000.',
    benefits: '₱15,000 per academic semester direct tuition and educational assistance.',
    requirements: ['Certificate of Matriculation', 'Barangay Certificate of Indigency', 'Valid Student ID'],
    evaluationStages: ['Document Verification', 'Income Threshold Audit', 'Disbursement Approval'],
    slots: 75,
    type: 'financial_need',
    status: 'open',
    allowance: '₱15,000 / sem',
    maxAmount: 30000,
  },
  {
    id: 'dev-1003',
    title: 'Ayala Tech Innovators Undergraduate Fellowship',
    sponsor_name: 'Ayala Foundation',
    deadline: '2026-11-15',
    description: 'Innovation fellowship for students pursuing computer science, AI, data analytics, and modern software engineering.',
    eligibilityRequirements: 'Bachelors student in Computer Science, IT, Data Science, or Computer Engineering with GWA >= 1.75.',
    benefits: 'Full tuition coverage, monthly technology allowance, and mentorship from industry tech leads.',
    requirements: ['Official Transcript of Records', 'GitHub Portfolio / Project Link', 'Recommendation Letter'],
    evaluationStages: ['Portfolio Technical Review', 'Technical Panel Interview', 'Fellowship Confirmation'],
    slots: 30,
    type: 'stem',
    status: 'open',
    allowance: '₱7,500 / mo',
    maxAmount: 75000,
  },
]

export default function ScholarshipPreview({ onSelectScholarship }) {
  const [scholarships, setScholarships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [deadlineFilter, setDeadlineFilter] = useState('ALL') // ALL, OPEN, EXPIRING_SOON
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Detail view state
  const [detailScholarship, setDetailScholarship] = useState(null)
  const [devModeActive, setDevModeActive] = useState(false)

  const detailModalRef = useRef(null)

  // Parse URL hash parameters (e.g. from Hero search desk)
  useEffect(() => {
    const parseHashParams = () => {
      const hash = window.location.hash || ''
      if (hash.includes('?')) {
        const queryPart = hash.split('?')[1]
        const params = new URLSearchParams(queryPart)
        const q = params.get('q')
        const t = params.get('type')
        if (q) setSearchQuery(q)
        if (t) setTypeFilter(t)
      }
    }
    parseHashParams()
    window.addEventListener('hashchange', parseHashParams)
    return () => window.removeEventListener('hashchange', parseHashParams)
  }, [])

  const [isLiveApi, setIsLiveApi] = useState(true)

  const fetchScholarships = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get('/api/scholarships', { retries: 1 })
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.scholarships)
        ? data.scholarships
        : Array.isArray(data?.data)
        ? data.data
        : []

      if (list.length > 0) {
        setScholarships(list)
        setIsLiveApi(true)
        setDevModeActive(false)
      } else {
        setScholarships(DEV_SAMPLE_FIXTURES)
        setIsLiveApi(false)
        setDevModeActive(false)
      }
    } catch (err) {
      console.warn('[ScholarshipPreview] Live API unreachable, using showcase grant directory:', err?.message)
      setScholarships(DEV_SAMPLE_FIXTURES)
      setIsLiveApi(false)
      setDevModeActive(false)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScholarships()
  }, [])

  // Escape key listener for detail modal & mobile drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (detailScholarship) setDetailScholarship(null)
        if (mobileFiltersOpen) setMobileFiltersOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailScholarship, mobileFiltersOpen])

  // Derive unique provider names from live data
  const availableProviders = useMemo(() => {
    const orgs = new Set()
    scholarships.forEach((item) => {
      const name = item.sponsor_name || item.organization_name || item.provider_name
      if (name && typeof name === 'string' && name.trim()) {
        orgs.add(name.trim())
      }
    })
    return Array.from(orgs).sort()
  }, [scholarships])

  // Multi-facet filtered records
  const filteredScholarships = useMemo(() => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return scholarships.filter((item) => {
      // 1. Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const title = (item.title || item.name || '').toLowerCase()
        const org = (item.sponsor_name || item.organization_name || item.provider_name || '').toLowerCase()
        const desc = (item.description || item.eligibilityRequirements || '').toLowerCase()
        if (!title.includes(q) && !org.includes(q) && !desc.includes(q)) {
          return false
        }
      }

      // 2. Provider filter
      if (providerFilter !== 'ALL') {
        const org = (item.sponsor_name || item.organization_name || item.provider_name || '').trim()
        if (org !== providerFilter) return false
      }

      // 3. Scholarship Type filter
      if (typeFilter !== 'ALL') {
        const itemType = (item.type || '').toLowerCase()
        if (typeFilter === 'stem' && !itemType.includes('stem') && !item.title?.toLowerCase().includes('stem')) return false
        if (typeFilter === 'merit' && !itemType.includes('merit') && !itemType.includes('academic')) return false
        if (typeFilter === 'financial_need' && !itemType.includes('financial') && !itemType.includes('need')) return false
      }

      // 4. Deadline filter
      const deadlineStr = item.deadline || item.applicationDeadline
      if (deadlineStr) {
        const dDate = new Date(deadlineStr)
        const isPast = dDate < now
        if (deadlineFilter === 'OPEN' && isPast) return false
        if (deadlineFilter === 'EXPIRING_SOON') {
          if (isPast || dDate > thirtyDaysFromNow) return false
        }
      }

      return true
    })
  }, [scholarships, searchQuery, providerFilter, typeFilter, deadlineFilter])

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (providerFilter !== 'ALL') count++
    if (typeFilter !== 'ALL') count++
    if (deadlineFilter !== 'ALL') count++
    return count
  }, [searchQuery, providerFilter, typeFilter, deadlineFilter])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredScholarships.length / itemsPerPage))
  const paginatedScholarships = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredScholarships.slice(start, start + itemsPerPage)
  }, [filteredScholarships, currentPage])

  const resetAllFilters = () => {
    setSearchQuery('')
    setProviderFilter('ALL')
    setTypeFilter('ALL')
    setDeadlineFilter('ALL')
    setCurrentPage(1)
  }

  return (
    <section id="scholarships" className="py-12 md:py-20 section-white" aria-labelledby="scholarships-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header & Desk Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="max-w-2xl space-y-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Official Registry</span>
            </div>

            <h2 id="scholarships-heading" className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--color-text-heading)]">
              Scholarship Programs Directory
            </h2>

            <p className="body-text text-sm sm:text-base leading-relaxed">
              Explore active grant programs directly published by accredited foundations, corporate sponsors, and government agencies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchScholarships}
              disabled={loading}
              className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              aria-label="Refresh scholarship directory"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Updating...' : 'Sync Directory'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Controls */}
        <div className="py-6 space-y-4">
          {/* Desktop Search & Filter Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] items-center">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search programs, fields, or providers..."
                className="input-field text-sm w-full"
                style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                aria-label="Search scholarships"
              />
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
            </div>

            {/* Provider Filter */}
            <div>
              <label htmlFor="desk-filter-provider" className="sr-only">Filter by Provider</label>
              <select
                id="desk-filter-provider"
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field text-xs sm:text-sm w-full"
              >
                <option value="ALL">All Providers ({availableProviders.length})</option>
                {availableProviders.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Program Type Filter */}
            <div>
              <label htmlFor="desk-filter-type" className="sr-only">Filter by Type</label>
              <select
                id="desk-filter-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field text-xs sm:text-sm w-full"
              >
                <option value="ALL">All Classifications</option>
                <option value="merit">Academic & Merit</option>
                <option value="financial_need">Financial Need</option>
                <option value="stem">STEM & Tech Focus</option>
              </select>
            </div>

            {/* Deadline Status Filter */}
            <div>
              <label htmlFor="desk-filter-deadline" className="sr-only">Filter by Deadline</label>
              <select
                id="desk-filter-deadline"
                value={deadlineFilter}
                onChange={(e) => {
                  setDeadlineFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field text-xs sm:text-sm w-full"
              >
                <option value="ALL">All Deadlines</option>
                <option value="OPEN">Open Only</option>
                <option value="EXPIRING_SOON">Closing in 30 Days</option>
              </select>
            </div>
          </div>

          {/* Active Filter Summary Bar */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border bg-blue-500/5 border-blue-500/15 text-xs">
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-text-heading)]">Active Filters:</span>
                <span>Found {filteredScholarships.length} of {scholarships.length} total programs</span>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="font-bold text-[#305BFE] hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading scholarship records">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="card-modern p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
              >
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
                <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* API Error State with Explicit Retry */}
        {!loading && error && (
          <div
            className="p-8 rounded-2xl border text-center max-w-lg mx-auto space-y-4 my-6"
            style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: '#fca5a5' }}
            role="alert"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="card-heading text-lg font-bold">Unable to Connect to Live Directory</h3>
            <p className="body-text text-sm">
              {error}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={fetchScholarships}
                className="btn-action text-xs font-bold px-5 py-2.5"
              >
                Retry API Request
              </button>

              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={() => {
                    setScholarships(DEV_SAMPLE_FIXTURES)
                    setError(null)
                    setDevModeActive(true)
                  }}
                  className="btn-secondary text-xs font-semibold px-4 py-2.5"
                >
                  Load Dev Sample Grants (Dev Only)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredScholarships.length === 0 && (
          <div
            className="card-modern p-12 text-center max-w-md mx-auto space-y-4 my-6"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-[#305BFE]">
              <SearchIcon className="w-6 h-6" />
            </div>
            <h3 className="card-heading text-lg font-bold">
              {scholarships.length === 0 ? 'No Published Grants Found' : 'No Matching Opportunities'}
            </h3>
            <p className="body-text text-sm">
              {scholarships.length === 0
                ? 'There are currently no active scholarships open in the live database. Please check back shortly.'
                : 'No scholarship opportunities matched your search criteria.'}
            </p>
            <div className="pt-2">
              {scholarships.length > 0 ? (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="btn-secondary text-xs font-bold px-4 py-2"
                >
                  Clear Active Filters
                </button>
              ) : import.meta.env.DEV ? (
                <button
                  type="button"
                  onClick={() => {
                    setScholarships(DEV_SAMPLE_FIXTURES)
                    setDevModeActive(true)
                  }}
                  className="btn-secondary text-xs font-semibold px-4 py-2"
                >
                  Load Dev Sample Grants (Dev Only)
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Populated Results: Structured Desk Rows on Desktop, Compact Cards on Mobile */}
        {!loading && !error && paginatedScholarships.length > 0 && (
          <div className="space-y-3">
            {/* Table Header Row (Hidden on mobile) */}
            <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_120px] gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span>Program & Sponsor</span>
              <span>Eligibility & Overview</span>
              <span>Deadline & Status</span>
              <span>Grant Value & Slots</span>
              <span className="text-right">Action</span>
            </div>

            {/* Structured Result Rows */}
            {paginatedScholarships.map((item) => {
              const grantId = item.id || item._id
              const title = item.title || item.name || 'Scholarship Grant'
              const sponsorName = item.sponsor_name || item.organization_name || item.provider_name || 'Verified Provider'
              const deadline = item.deadline || item.applicationDeadline
              const isPastDeadline = deadline ? new Date(deadline) < new Date() : false
              const status = isPastDeadline ? 'Closed' : (item.status === 'closed' ? 'Closed' : 'Open')
              const description = item.description || item.eligibilityRequirements || 'Criteria defined upon application review.'

              // STRICT RULE: Remaining slots ONLY when supplied by API
              const hasExplicitSlots = item.slots != null || item.totalSlots != null || item.availableSlots != null
              const slotsCount = item.availableSlots ?? item.slots ?? item.totalSlots

              const allowance = item.allowance || (item.maxAmount ? `₱${Number(item.maxAmount).toLocaleString()} / grant` : null)

              return (
                <div
                  key={grantId}
                  className="card-modern p-5 transition hover:border-[#305BFE] flex flex-col lg:grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_120px] gap-4 items-start lg:items-center"
                  style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                >
                  {/* Col 1: Program & Sponsor */}
                  <div className="space-y-1 w-full min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#305BFE]">
                      <BuildingIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sponsorName}</span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-heading)] leading-snug">
                      {title}
                    </h3>
                  </div>

                  {/* Col 2: Eligibility & Overview */}
                  <div className="w-full">
                    <p className="body-text text-xs leading-relaxed line-clamp-2">
                      {description}
                    </p>
                  </div>

                  {/* Col 3: Deadline & Status */}
                  <div className="space-y-1 w-full">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-mono tabular-nums">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <span>{deadline ? new Date(deadline).toLocaleDateString() : 'Rolling Application'}</span>
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          status === 'Open'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Col 4: Grant Value & Slots (Only if provided by API) */}
                  <div className="space-y-1 w-full text-xs">
                    {allowance ? (
                      <span className="font-bold text-[var(--color-text-heading)] block tabular-nums">
                        {allowance}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)] block">Tuition Support</span>
                    )}

                    {hasExplicitSlots && (
                      <span className="font-mono text-[11px] text-[var(--color-text-muted)] block tabular-nums">
                        {slotsCount} slots available
                      </span>
                    )}
                  </div>

                  {/* Col 5: Desk Action Button */}
                  <div className="w-full flex lg:justify-end pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => setDetailScholarship(item)}
                      className="btn-secondary py-2 px-3.5 text-xs font-bold w-full lg:w-auto text-center justify-center flex items-center gap-1.5 cursor-pointer"
                      aria-label={`Inspect case details for ${title}`}
                    >
                      <span>Review Details</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && filteredScholarships.length > itemsPerPage && (
          <div className="flex items-center justify-between pt-8 border-t mt-8 text-xs font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredScholarships.length)} of {filteredScholarships.length} programs
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary py-1.5 px-3 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-mono tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary py-1.5 px-3 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Case Dossier Detail View Dialog */}
      {detailScholarship && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dossier-title"
          onClick={() => setDetailScholarship(null)}
        >
          <div
            ref={detailModalRef}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 sm:p-8 space-y-6 shadow-2xl relative"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Breadcrumb Navigation & Close */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                <span>Scholarships</span>
                <span>/</span>
                <span className="text-[#305BFE] truncate max-w-[280px]">
                  {detailScholarship.title || detailScholarship.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailScholarship(null)}
                className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                aria-label="Close scholarship dossier"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#305BFE]">
                <BuildingIcon className="w-4 h-4" />
                <span>{detailScholarship.sponsor_name || detailScholarship.organization_name || 'Accredited Provider'}</span>
              </div>
              <h3 id="modal-dossier-title" className="text-xl sm:text-2xl font-bold text-[var(--color-text-heading)]">
                {detailScholarship.title || detailScholarship.name}
              </h3>
            </div>

            {/* Key Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">Deadline</span>
                <span className="text-xs sm:text-sm font-bold text-[var(--color-text-heading)] font-mono tabular-nums">
                  {detailScholarship.deadline || detailScholarship.applicationDeadline
                    ? new Date(detailScholarship.deadline || detailScholarship.applicationDeadline).toLocaleDateString()
                    : 'Open'}
                </span>
              </div>

              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">Available Slots</span>
                <span className="text-xs sm:text-sm font-bold text-[var(--color-text-heading)] font-mono tabular-nums">
                  {detailScholarship.slots ?? detailScholarship.totalSlots ?? 'Rolling Intake'}
                </span>
              </div>

              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">Grant Allowance</span>
                <span className="text-xs sm:text-sm font-bold text-[#305BFE] tabular-nums">
                  {detailScholarship.allowance || (detailScholarship.maxAmount ? `₱${Number(detailScholarship.maxAmount).toLocaleString()}` : 'Tuition Subsidy')}
                </span>
              </div>

              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">Classification</span>
                <span className="text-xs sm:text-sm font-bold text-[var(--color-text-heading)] capitalize">
                  {detailScholarship.type || 'Academic Merit'}
                </span>
              </div>
            </div>

            {/* Detailed Content Dossier */}
            <div className="space-y-5 text-sm">
              {/* Program Overview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--color-text-secondary)]">
                  Program Overview
                </h4>
                <p className="body-text leading-relaxed">
                  {detailScholarship.description || 'Full specifications provided upon mobile application intake.'}
                </p>
              </div>

              {/* Eligibility Requirements */}
              {detailScholarship.eligibilityRequirements && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--color-text-secondary)]">
                    Eligibility Criteria
                  </h4>
                  <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/15 body-text text-xs leading-relaxed">
                    {detailScholarship.eligibilityRequirements}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {detailScholarship.benefits && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--color-text-secondary)]">
                    Grant Benefits
                  </h4>
                  <p className="body-text text-xs leading-relaxed">
                    {detailScholarship.benefits}
                  </p>
                </div>
              )}

              {/* Required Documents Checklist */}
              {Array.isArray(detailScholarship.requirements) && detailScholarship.requirements.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--color-text-secondary)]">
                    Required Verification Documents
                  </h4>
                  <ul className="space-y-1.5 text-xs body-text">
                    {detailScholarship.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-[#305BFE] shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Student Mobile Exclusivity Guidance Box */}
              <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>How to Apply for this Program</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Student applications, document scans, and OCR validations are conducted exclusively through the official <strong>ISKOLAR Mobile App</strong>. Web applications are not accepted to ensure device security and identity verification.
                </p>
              </div>
            </div>

            {/* Dossier Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setDetailScholarship(null)}
                className="btn-secondary text-xs font-bold px-4 py-2"
              >
                Close Dossier
              </button>

              <a
                href="#download"
                onClick={() => setDetailScholarship(null)}
                className="btn-action text-xs font-bold px-5 py-2.5 flex items-center gap-1.5"
              >
                <span>Apply via Mobile App</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

    </section>
  )
}
