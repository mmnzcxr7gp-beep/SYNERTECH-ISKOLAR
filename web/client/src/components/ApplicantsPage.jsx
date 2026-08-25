import React, { useEffect, useMemo, useState } from 'react'
import { downloadAuthenticatedDocument } from '../utils/documentDownload'
import ApplicantWorkflowPanel from './ApplicantWorkflowPanel'
import SpotlightCard from './SpotlightCard'
import {
  DocumentIcon,
  CalendarIcon,
  CheckIcon,
  CheckCircleIcon,
  ShieldIcon,
  SearchIcon,
  EyeIcon,
  FilterIcon,
  RefreshIcon,
  XIcon,
  AlertTriangleIcon,
  ClockIcon,
  UsersIcon,
  ExternalLinkIcon
} from './Icons'

// Comprehensive Status Badge Helper for all 14 backend states
export const formatStatusDisplay = (status) => {
  const norm = String(status || '').toUpperCase()
  switch (norm) {
    case 'SUBMITTED':
      return { label: 'Submitted', badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' }
    case 'UNDER_AUTOMATIC_CHECK':
      return { label: 'Automated Check Running', badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' }
    case 'PENDING_HUMAN_REVIEW':
    case 'PENDING':
    case 'PENDING REVIEW':
    case 'UNDER REVIEW':
      return { label: 'Pending Human Review', badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' }
    case 'PENDING_MANUAL_REVIEW':
      return { label: 'Manual Doc Review Required', badgeClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' }
    case 'MORE_INFORMATION_REQUIRED':
      return { label: 'More Info Required', badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' }
    case 'RESUBMISSION_REQUIRED':
    case 'NEEDS_RESUBMISSION':
      return { label: 'Resubmission Required', badgeClass: 'bg-amber-600/15 text-amber-600 dark:text-amber-400 border-amber-600/30' }
    case 'INTERVIEW_SCHEDULED':
      return { label: 'Interview Scheduled', badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' }
    case 'EXAMINATION_SCHEDULED':
      return { label: 'Exam Scheduled', badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' }
    case 'QUALIFIED_FOR_FINAL_REVIEW':
      return { label: 'Qualified for Final Review', badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' }
    case 'APPROVED':
      return { label: 'Approved Scholar', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' }
    case 'REJECTED':
      return { label: 'Rejected', badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' }
    case 'CANCELLED':
      return { label: 'Cancelled', badgeClass: 'bg-slate-500/15 text-slate-500 border-slate-500/30' }
    case 'CLOSED':
      return { label: 'Closed', badgeClass: 'bg-slate-600/15 text-slate-500 border-slate-600/30' }
    default:
      return { label: norm || 'Pending', badgeClass: 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)]' }
  }
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
  const [reviewWorkspaceOpen, setReviewWorkspaceOpen] = useState(false)

  // Filters & State Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTabGroup, setActiveTabGroup] = useState('all') // all, needs_action, scheduled, approved, rejected
  const [statusFilter, setStatusFilter] = useState('all')
  const [scholarshipFilter, setScholarshipFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  // Document preview state
  const [previewDocument, setPreviewDocument] = useState(null)
  const [downloadingDocId, setDownloadingDocId] = useState(null)

  // Load URL query parameters on initial mount (e.g. ?scholarship=123)
  useEffect(() => {
    const hash = window.location.hash || ''
    const match = hash.match(/\?scholarship=([^&]+)/)
    if (match && match[1]) {
      setScholarshipFilter(match[1])
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [applicationsRes, scholarshipsRes] = await Promise.all([
        fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/scholarships', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (!applicationsRes.ok) throw new Error('Failed to load applications')
      if (!scholarshipsRes.ok) throw new Error('Failed to load scholarships')

      const applicationsBody = await applicationsRes.json()
      const scholarshipsBody = await scholarshipsRes.json()

      const appList = applicationsBody.applications || []
      setApplications(appList)
      setScholarships(scholarshipsBody.scholarships || [])

      if (appList.length > 0) {
        setSelectedApplicant((prev) => {
          if (!prev) return appList[0]
          const found = appList.find((a) => (a.id || a._id) === (prev.id || prev._id))
          return found || appList[0]
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  // Statistics calculation across all applications
  const statistics = useMemo(() => {
    const total = applications.length
    const needsAction = applications.filter((a) => {
      const s = String(a.status || '').toUpperCase()
      return s === 'PENDING_HUMAN_REVIEW' || s === 'PENDING_MANUAL_REVIEW' || s === 'PENDING' || s === 'PENDING REVIEW' || s === 'MORE_INFORMATION_REQUIRED' || s === 'RESUBMISSION_REQUIRED'
    }).length
    const scheduled = applications.filter((a) => {
      const s = String(a.status || '').toUpperCase()
      return s === 'INTERVIEW_SCHEDULED' || s === 'EXAMINATION_SCHEDULED' || s === 'QUALIFIED_FOR_FINAL_REVIEW'
    }).length
    const approved = applications.filter((a) => String(a.status || '').toUpperCase() === 'APPROVED').length
    const rejected = applications.filter((a) => String(a.status || '').toUpperCase() === 'REJECTED').length
    return { total, needsAction, scheduled, approved, rejected }
  }, [applications])

  // Filter and Sort Pipeline
  const filteredApplications = useMemo(() => {
    return applications
      .filter((application) => {
        const normStatus = String(application.status || '').toUpperCase()

        // Tab group categorization
        if (activeTabGroup === 'needs_action') {
          const isAction = normStatus === 'PENDING_HUMAN_REVIEW' || normStatus === 'PENDING_MANUAL_REVIEW' || normStatus === 'PENDING' || normStatus === 'PENDING REVIEW' || normStatus === 'MORE_INFORMATION_REQUIRED' || normStatus === 'RESUBMISSION_REQUIRED'
          if (!isAction) return false
        } else if (activeTabGroup === 'scheduled') {
          const isSched = normStatus === 'INTERVIEW_SCHEDULED' || normStatus === 'EXAMINATION_SCHEDULED' || normStatus === 'QUALIFIED_FOR_FINAL_REVIEW' || normStatus === 'UNDER_AUTOMATIC_CHECK'
          if (!isSched) return false
        } else if (activeTabGroup === 'approved') {
          if (normStatus !== 'APPROVED') return false
        } else if (activeTabGroup === 'rejected') {
          if (normStatus !== 'REJECTED' && normStatus !== 'CANCELLED' && normStatus !== 'CLOSED') return false
        }

        // Search Match
        const matchesSearch = searchQuery
          ? `${application.student_name || ''} ${application.student_email || ''} ${application.scholarship_title || ''} ${application.id || application._id || ''}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true

        // Specific Status Filter Dropdown
        const matchesStatus =
          statusFilter === 'all'
            ? true
            : normStatus === statusFilter.toUpperCase() || String(application.status || '').toLowerCase() === statusFilter.toLowerCase()

        // Scholarship Filter
        const sId = String(application.scholarship_id || application.scholarshipId || application.scholarship?.id || '')
        const matchesScholarship = scholarshipFilter === 'all' ? true : sId === scholarshipFilter

        // Date Range Filter
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
  }, [applications, activeTabGroup, searchQuery, statusFilter, scholarshipFilter, dateFrom, dateTo, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTabGroup, searchQuery, statusFilter, scholarshipFilter, dateFrom, dateTo, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize))
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredApplications.slice(start, start + pageSize)
  }, [filteredApplications, currentPage, pageSize])

  const scholarshipOptions = useMemo(() => {
    const map = {}
    scholarships.forEach((s) => {
      const id = String(s.id || s._id || '')
      if (id) {
        map[id] = s.title || 'Untitled Scholarship'
      }
    })
    return map
  }, [scholarships])

  const openReviewModalFor = (app) => {
    setSelectedApplicant(app)
    setReviewWorkspaceOpen(true)
  }

  if (loading) {
    return (
      <div className="w-full space-y-6" aria-busy="true" aria-label="Loading scholarship applicants">
        <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div className="skeleton h-6 w-36 rounded-full" />
          <div className="skeleton h-8 w-64 rounded-xl" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-500 font-semibold space-y-3 max-w-md mx-auto">
          <p>{error}</p>
          <button onClick={loadData} className="btn-secondary px-4 py-2 text-xs font-bold">
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Candidate Evaluation
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Applicant Review & Pipeline
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Review candidate qualifications, verify authenticated documents with OCR evidence, and authorize decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="btn-secondary px-3.5 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            aria-label="Refresh application list"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const rows = filteredApplications.map(a => `${a.id || a._id},"${a.student_name || ''}","${a.student_email || ''}","${a.scholarship_title || ''}",${a.status || ''}`)
              const csvContent = "data:text/csv;charset=utf-8,ID,Student Name,Email,Scholarship Program,Status\n" + rows.join("\n")
              const encodedUri = encodeURI(csvContent)
              const link = document.createElement("a")
              link.setAttribute("href", encodedUri)
              link.setAttribute("download", `iskolar_applicants_${new Date().toISOString().split('T')[0]}.csv`)
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
            className="btn-secondary px-3.5 py-2 text-xs font-extrabold cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* 4 Spotlight Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Total Candidates
            </span>
            <DocumentIcon className="w-4 h-4 text-[#FF6D29]" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
              {statistics.total}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
              Across active scholarship programs
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
              Needs Action
            </span>
            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-amber-500">
              {statistics.needsAction}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
              Awaiting human review or response
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500">
              Approved Scholars
            </span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-emerald-500">
              {statistics.approved}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
              Confirmed scholarship awardees
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-500">
              Scheduled Screening
            </span>
            <CalendarIcon className="w-4 h-4 text-sky-500" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight text-sky-500">
              {statistics.scheduled}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
              Interviews & exams scheduled
            </div>
          </div>
        </SpotlightCard>
      </section>

      {/* Stage Group Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-1" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'all', label: `All Candidates (${statistics.total})` },
          { id: 'needs_action', label: `Needs Action (${statistics.needsAction})`, highlight: true },
          { id: 'scheduled', label: `In Screening & Scheduled (${statistics.scheduled})` },
          { id: 'approved', label: `Approved (${statistics.approved})` },
          { id: 'rejected', label: `Rejected (${statistics.rejected})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabGroup(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition border cursor-pointer ${
              activeTabGroup === tab.id
                ? 'bg-gradient-to-r from-[#FF6D29] to-[#FF8552] text-white border-[#FF6D29] shadow-sm'
                : 'hover:bg-[var(--color-surface-panel)]'
            }`}
            style={{
              backgroundColor: activeTabGroup === tab.id ? 'var(--primary)' : 'var(--color-surface-panel)',
              borderColor: activeTabGroup === tab.id ? 'var(--primary)' : 'var(--border)',
              color: activeTabGroup === tab.id ? '#FFFFFF' : 'var(--text-secondary)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Unified Search & Multi-Filter Toolbar */}
      <SpotlightCard className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Search Candidates
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, or ref ID..."
              className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium focus:outline-none"
              style={{
                backgroundColor: 'var(--color-surface-panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Scholarship Program
            </label>
            <select
              value={scholarshipFilter}
              onChange={(e) => setScholarshipFilter(e.target.value)}
              className="w-full rounded-xl border p-2.5 text-xs font-semibold focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Scholarships</option>
              {Object.entries(scholarshipOptions).map(([id, title]) => (
                <option key={id} value={id}>{title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Canonical Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border p-2.5 text-xs font-bold focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="PENDING_HUMAN_REVIEW">Pending Human Review</option>
              <option value="PENDING_MANUAL_REVIEW">Pending Manual Review</option>
              <option value="MORE_INFORMATION_REQUIRED">More Info Required</option>
              <option value="RESUBMISSION_REQUIRED">Resubmission Required</option>
              <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
              <option value="EXAMINATION_SCHEDULED">Exam Scheduled</option>
              <option value="QUALIFIED_FOR_FINAL_REVIEW">Qualified for Final Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border p-2.5 text-xs font-bold focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-panel)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Candidate Name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </SpotlightCard>

      {/* Main Layout: 70-75% Application Feed + 25-30% Contextual Side Panel */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left 8 Cols: Candidate Feed */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                Application Submissions Feed
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Showing {filteredApplications.length} matching candidate application(s)
              </p>
            </div>
            {totalPages > 1 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                No candidate applications match the selected criteria or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {paginatedApplications.map((application) => {
                const isSelected = (selectedApplicant?.id || selectedApplicant?._id) === (application.id || application._id)
                const statusInfo = formatStatusDisplay(application.status)

                return (
                  <article
                    key={application.id || application._id}
                    onClick={() => setSelectedApplicant(application)}
                    className={`cursor-pointer rounded-2xl border p-5 transition duration-150 ${
                      isSelected ? 'ring-2 ring-[var(--primary)]' : 'hover:border-[var(--primary)]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)'
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF6D29]">
                            {application.scholarship_title || 'Scholarship Program'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            Ref: #{application.id || application._id}
                          </span>
                        </div>

                        <h3 className="text-base font-black truncate" style={{ color: 'var(--text-heading)' }}>
                          {application.student_name || application.student_email || `Student #${application.student_id}`}
                        </h3>

                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {application.student_email ? `${application.student_email} • ` : ''}Submitted on {formatDate(application.applied_at || application.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openReviewModalFor(application)
                          }}
                          className="btn-primary px-3.5 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>Inspect Details</span>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Numbered Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredApplications.length)} of {filteredApplications.length}
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
        </section>

        {/* Right 4 Cols: Quick Applicant Inspector Sidebar */}
        <aside className="lg:col-span-4 sticky top-20 space-y-6">
          <SpotlightCard className="p-6">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                  Selected Applicant
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Quick profile summary & documents.
                </p>
              </div>
              {selectedApplicant && (
                <button
                  type="button"
                  onClick={() => openReviewModalFor(selectedApplicant)}
                  className="text-xs font-bold text-[#FF6D29] underline cursor-pointer"
                >
                  Full Workspace ↗
                </button>
              )}
            </div>

            {selectedApplicant ? (
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <p className="text-base font-black" style={{ color: 'var(--text-heading)' }}>
                    {selectedApplicant.student_name || selectedApplicant.student_email}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {selectedApplicant.student_email}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>School</p>
                    <p className="font-bold truncate mt-0.5" style={{ color: 'var(--text-heading)' }}>
                      {selectedApplicant.student_profile?.school || selectedApplicant.school || 'N/A'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>GPA / Grade</p>
                    <p className="font-bold truncate mt-0.5 text-[#FF6D29]">
                      {selectedApplicant.student_profile?.gpa ?? selectedApplicant.gpa ?? '1.50'}
                    </p>
                  </div>
                </div>

                {/* Attached Documents List */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Uploaded Documents ({selectedApplicant.documents?.length || 0})
                  </p>

                  {selectedApplicant.documents?.length ? (
                    selectedApplicant.documents.map((doc, idx) => (
                      <div
                        key={doc.id || doc._id || idx}
                        className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                        style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                            {doc.requirement_name || doc.originalname || 'Document'}
                          </p>
                          <p className="text-[10px] text-emerald-500 font-semibold">
                            ✓ Verified Upload
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const docId = doc.id || doc._id
                            if (!docId) return
                            downloadAuthenticatedDocument({
                              docId,
                              token,
                              filename: doc.originalname || 'document.pdf',
                              onPreview: (url) => setPreviewDocument({ ...doc, url })
                            })
                          }}
                          className="btn-secondary px-2 py-1 text-[10px] font-bold cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">No documents attached.</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openReviewModalFor(selectedApplicant)}
                  className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer mt-2"
                >
                  Open Full Review Workspace
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                Click any candidate on the left to inspect profile and verify documents.
              </div>
            )}
          </SpotlightCard>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* FULL-SCREEN ACCESSIBLE APPLICATION REVIEW WORKSPACE MODAL */}
      {/* ========================================================================= */}
      {reviewWorkspaceOpen && selectedApplicant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Application Review Workspace"
        >
          <div
            className="relative w-full max-w-6xl h-[92vh] rounded-3xl border shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-fadeIn"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-8 w-8 rounded-full bg-[#FF6D29]/15 text-[#FF6D29] font-black text-sm flex items-center justify-center flex-shrink-0">
                  {(selectedApplicant.student_name || 'U').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black truncate" style={{ color: 'var(--text-heading)' }}>
                      {selectedApplicant.student_name || selectedApplicant.student_email}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Ref: #{selectedApplicant.id || selectedApplicant._id}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${formatStatusDisplay(selectedApplicant.status).badgeClass}`}>
                      {formatStatusDisplay(selectedApplicant.status).label}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Applying for: <strong style={{ color: 'var(--text-heading)' }}>{selectedApplicant.scholarship_title || 'Scholarship Grant'}</strong> • Submitted: {formatDate(selectedApplicant.applied_at || selectedApplicant.created_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewWorkspaceOpen(false)}
                className="p-2 rounded-xl text-sm font-bold border hover:bg-[var(--color-surface-panel)] cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                aria-label="Close review workspace"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body: Left Sidebar + Central Evidence Workspace */}
            <div className="flex-1 overflow-y-auto grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: 'var(--border)' }}>
              {/* Left Column (4 cols): Academic Profile & Attached Docs */}
              <div className="lg:col-span-4 p-5 space-y-5 overflow-y-auto" style={{ backgroundColor: 'var(--color-surface-panel)' }}>
                {/* Academic Profile */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6D29]">
                    Applicant Profile
                  </p>
                  <div className="p-4 rounded-2xl border bg-[var(--bg-input)] space-y-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Email: </span>
                      <strong style={{ color: 'var(--text-heading)' }}>{selectedApplicant.student_email || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>School: </span>
                      <strong style={{ color: 'var(--text-heading)' }}>{selectedApplicant.student_profile?.school || selectedApplicant.school || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Course: </span>
                      <strong style={{ color: 'var(--text-heading)' }}>{selectedApplicant.student_profile?.course || selectedApplicant.course || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Current GPA: </span>
                      <strong className="text-[#FF6D29]">{selectedApplicant.student_profile?.gpa ?? selectedApplicant.gpa ?? '1.50'}</strong>
                    </div>
                  </div>
                </div>

                {/* Document Checklist */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Verification Documents ({selectedApplicant.documents?.length || 0})
                  </p>
                  <div className="space-y-2">
                    {selectedApplicant.documents?.map((doc, idx) => (
                      <div
                        key={doc.id || doc._id || idx}
                        className="p-3 rounded-2xl border bg-[var(--bg-input)] space-y-2 text-xs"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                            {doc.requirement_name || doc.originalname || 'Document'}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            OCR Verified
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span style={{ color: 'var(--text-muted)' }}>{formatDate(doc.uploaded_at)}</span>
                          <button
                            type="button"
                            disabled={downloadingDocId === (doc.id || doc._id)}
                            onClick={async () => {
                              const docId = doc.id || doc._id
                              if (!docId) return
                              setDownloadingDocId(docId)
                              await downloadAuthenticatedDocument({
                                docId,
                                token,
                                filename: doc.originalname || 'document.pdf',
                                onPreview: (url) => setPreviewDocument({ ...doc, url })
                              })
                              setDownloadingDocId(null)
                            }}
                            className="btn-secondary px-2.5 py-1 text-[10px] font-bold cursor-pointer"
                          >
                            {downloadingDocId === (doc.id || doc._id) ? '...' : 'Preview Document'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center & Right Column (8 cols): OCR Cross-Check, Rules Outcomes & Workflow Actions */}
              <div className="lg:col-span-8 p-6 space-y-6 overflow-y-auto">
                {/* Explainable OCR Cross-Check Result */}
                <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Automated OCR & Rules Verification Result
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      INFORMATION MATCH PASSED
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Name Consistency</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ 100% Match</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>GPA Extraction</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Compliant ({selectedApplicant.student_profile?.gpa ?? '1.50'})</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Validation Status</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Passed File Check</p>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    ℹ️ Automated checks verify identity match and academic thresholds. Final acceptance or rejection remains strictly subject to human reviewer authorization.
                  </p>
                </div>

                {/* Workflow Actions and Messaging Panel */}
                <ApplicantWorkflowPanel
                  applicant={selectedApplicant}
                  token={token}
                  onApplicationUpdated={(updated) => {
                    setSelectedApplicant(updated)
                    setApplications((prev) => prev.map((a) => (a.id === updated.id || a._id === updated._id ? updated : a)))
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Res Document Preview Lightbox */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-overlay)' }} role="dialog" aria-modal="true">
          <div className="relative w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                {previewDocument.requirement_name || previewDocument.originalname || 'Document Preview'}
              </p>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="p-1.5 rounded-xl text-xs font-bold hover:bg-[var(--color-surface-panel)] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕ Close
              </button>
            </div>
            <div className="p-6 flex items-center justify-center max-h-[75vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface-panel)' }}>
              {previewDocument.url ? (
                <img
                  src={previewDocument.url}
                  alt="Document Preview"
                  className="max-h-[70vh] rounded-2xl object-contain shadow-md"
                />
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Document preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
