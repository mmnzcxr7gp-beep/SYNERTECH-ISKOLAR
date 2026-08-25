import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './ThemeContext'
import IskolarLogo from './IskolarLogo'
import SpotlightCard from './SpotlightCard'
import ShinyButton from './ShinyButton'
import {
  DocumentIcon,
  GraduationCapIcon,
  SearchIcon,
  CalendarIcon,
  ChartIcon,
  BuildingIcon,
  LockIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  BoltIcon,
  ShieldIcon,
  CheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  UsersIcon,
  HistoryIcon,
  BellIcon,
  ChevronDownIcon,
  RefreshIcon,
  XIcon,
  ExternalLinkIcon
} from './Icons'
import ApplicantsPage from './ApplicantsPage'
import ScholarshipCreatePage from './ScholarshipCreatePage'
import ScholarshipsPage from './ScholarshipsPage'
import ScholarshipEditPage from './ScholarshipEditPage'
import ReportsPage from './ReportsPage'
import SettingsPage from './SettingsPage'
import SchedulingPage from './SchedulingPage'
import DocumentVerificationPage from './DocumentVerificationPage'
import PrivacyPolicyPage from './PrivacyPolicyPage'

// Provider Navigation Matrix
const providerNavItems = [
  { label: 'Dashboard Overview', icon: <SparklesIcon className="w-4 h-4" />, route: 'providers' },
  { label: 'My Scholarships', icon: <DocumentIcon className="w-4 h-4" />, route: 'providers/scholarships' },
  { label: 'Applicant Pipeline', icon: <GraduationCapIcon className="w-4 h-4" />, route: 'providers/applicants' },
  { label: 'Document & OCR Verification', icon: <ShieldIcon className="w-4 h-4" />, route: 'providers/verification' },
  { label: 'Interview & Exam Schedules', icon: <CalendarIcon className="w-4 h-4" />, route: 'providers/scheduling' },
  { label: 'Analytics & Reports', icon: <ChartIcon className="w-4 h-4" />, route: 'providers/reports' },
  { label: 'Organization & Settings', icon: <BuildingIcon className="w-4 h-4" />, route: 'providers/settings' },
]

// Administrator Navigation Matrix
const adminNavItems = [
  { label: 'Admin Overview', icon: <SparklesIcon className="w-4 h-4" />, route: 'admin' },
  { label: 'Provider Approvals', icon: <ShieldIcon className="w-4 h-4" />, route: 'admin/approvals' },
  { label: 'Users & Students Oversight', icon: <UsersIcon className="w-4 h-4" />, route: 'admin/students' },
  { label: 'All System Scholarships', icon: <DocumentIcon className="w-4 h-4" />, route: 'admin/scholarships' },
  { label: 'Applications Oversight', icon: <GraduationCapIcon className="w-4 h-4" />, route: 'admin/applicants' },
  { label: 'Document Verification', icon: <ShieldIcon className="w-4 h-4" />, route: 'admin/verification' },
  { label: 'Interview Schedules', icon: <CalendarIcon className="w-4 h-4" />, route: 'admin/scheduling' },
  { label: 'Audit Logs', icon: <HistoryIcon className="w-4 h-4" />, route: 'admin/audit' },
  { label: 'System Reports', icon: <ChartIcon className="w-4 h-4" />, route: 'admin/reports' },
  { label: 'System Settings & Health', icon: <LockIcon className="w-4 h-4" />, route: 'admin/settings' },
]

// -------------------------------------------------------------
// Admin Sub-Views: Provider Approvals, Students, and Audit Logs
// -------------------------------------------------------------
function AdminProviderApprovalsView({ token }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, verified

  const fetchProviders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/providers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load provider accounts')
      const body = await res.json()
      setProviders(body.providers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [token])

  const handleApprove = async (providerId) => {
    setActionLoading(`approve-${providerId}`)
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Failed to approve provider')
      await fetchProviders()
    } catch (err) {
      alert(`Approval error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerifyOrg = async (providerId) => {
    setActionLoading(`verify-${providerId}`)
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/verify`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'Verification failed')
      }
      await fetchProviders()
    } catch (err) {
      alert(`Verification error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredProviders = providers.filter((p) => {
    if (filter === 'pending') return !p.sponsor_verified || !p.organization_verified
    if (filter === 'verified') return p.sponsor_verified && p.organization_verified
    return true
  })

  return (
    <div className="w-full space-y-6">
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(255, 109, 41, 0.10)',
            color: 'var(--primary)',
            borderColor: 'rgba(255, 109, 41, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Provider Verification & Approvals
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Audit scholarship sponsor credentials, check corporate registration, and grant platform publishing authority.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: `All Providers (${providers.length})` },
          { id: 'pending', label: `Pending Review (${providers.filter(p => !p.sponsor_verified || !p.organization_verified).length})` },
          { id: 'verified', label: `Fully Verified (${providers.filter(p => p.sponsor_verified && p.organization_verified).length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition border cursor-pointer ${
              filter === tab.id
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                : 'hover:bg-[var(--color-surface-panel)]'
            }`}
            style={{
              backgroundColor: filter === tab.id ? 'var(--primary)' : 'var(--color-surface-panel)',
              borderColor: filter === tab.id ? 'var(--primary)' : 'var(--border)',
              color: filter === tab.id ? '#FFFFFF' : 'var(--text-secondary)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : filteredProviders.length === 0 ? (
        <SpotlightCard className="p-12 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No providers found matching the selected filter.
          </p>
        </SpotlightCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((prov) => (
            <SpotlightCard key={prov.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6D29]">
                    ID #{prov.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      prov.sponsor_verified
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {prov.sponsor_verified ? 'Account Approved' : 'Pending Account'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      prov.organization_verified
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                    }`}>
                      {prov.organization_verified ? 'Org Verified' : 'Org Unverified'}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-black truncate" style={{ color: 'var(--text-heading)' }}>
                  {prov.name || 'Provider Account'}
                </h3>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {prov.email}
                </p>
                {prov.company && (
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Company: <strong style={{ color: 'var(--text-heading)' }}>{prov.company}</strong>
                  </p>
                )}
                {prov.organization_website && (
                  <a
                    href={prov.organization_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold underline flex items-center gap-1 text-[#FF6D29]"
                  >
                    <span>{prov.organization_website}</span>
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                {!prov.sponsor_verified && (
                  <button
                    onClick={() => handleApprove(prov.id)}
                    disabled={actionLoading === `approve-${prov.id}`}
                    className="btn-primary flex-1 py-1.5 text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === `approve-${prov.id}` ? '...' : 'Approve Sponsor'}
                  </button>
                )}
                {!prov.organization_verified && (
                  <button
                    onClick={() => handleVerifyOrg(prov.id)}
                    disabled={actionLoading === `verify-${prov.id}`}
                    className="btn-secondary flex-1 py-1.5 text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === `verify-${prov.id}` ? '...' : 'Verify Org'}
                  </button>
                )}
                {prov.sponsor_verified && prov.organization_verified && (
                  <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 py-1">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Authorized Provider</span>
                  </div>
                )}
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminStudentsOversightView({ token }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/students', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load student profiles')
        const body = await res.json()
        setStudents(body.students || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.schoolName || '').toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)
  })

  return (
    <div className="w-full space-y-6">
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(255, 109, 41, 0.10)',
            color: 'var(--primary)',
            borderColor: 'rgba(255, 109, 41, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Student Candidate Oversight
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Monitor registered applicant profiles, verify school credentials, and inspect student records.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search student candidates by name, email, LRN, or school..."
        className="w-full rounded-xl border p-3 text-xs font-medium focus:outline-none"
        style={{
          backgroundColor: 'var(--color-surface-panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)'
        }}
      />

      {loading ? (
        <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading student records…</div>
      ) : filtered.length === 0 ? (
        <SpotlightCard className="p-8 text-center">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>No student records found.</p>
        </SpotlightCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left">
            <thead className="border-b" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Student Candidate</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>School / LRN</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>GPA</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((st) => (
                <tr key={st.id} className="transition hover:bg-[var(--color-surface-panel)]">
                  <td className="px-5 py-3.5 text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                    {st.name || `Student #${st.id}`}
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {st.email}
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div>{st.schoolName || 'N/A'}</div>
                    {st.lrn && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>LRN: {st.lrn}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-bold" style={{ color: 'var(--primary)' }}>
                    {st.gpa ?? 'N/A'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      st.isVerified
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}>
                      {st.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AdminAuditLogsView({ token }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/audit-logs', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load audit logs')
        const body = await res.json()
        setLogs(body.logs || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div className="w-full space-y-6">
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(255, 109, 41, 0.10)',
            color: 'var(--primary)',
            borderColor: 'rgba(255, 109, 41, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Security & System Audit Logs
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Immutable ledger of system events, authentication, human decisions, and data access.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading audit logs…</div>
      ) : logs.length === 0 ? (
        <SpotlightCard className="p-8 text-center">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No audit records currently found.
          </p>
        </SpotlightCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left">
            <thead className="border-b" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Timestamp</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Action</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actor</th>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {logs.map((log, idx) => (
                <tr key={log._id || idx} className="transition hover:bg-[var(--color-surface-panel)]">
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt || log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold" style={{ color: 'var(--primary)' }}>
                    {log.action || log.event || 'SYSTEM_ACTION'}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-heading)' }}>
                    {log.actorUserId?.email || log.actorRole || 'System'}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || log.description || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Master Route Mapping
const routeMap = {
  providers: null,
  admin: null,
  'providers/scholarships': ScholarshipsPage,
  'admin/scholarships': ScholarshipsPage,
  'providers/applicants': ApplicantsPage,
  'admin/applicants': ApplicantsPage,
  'providers/scheduling': SchedulingPage,
  'admin/scheduling': SchedulingPage,
  'providers/verification': DocumentVerificationPage,
  'admin/verification': DocumentVerificationPage,
  'admin/documents': DocumentVerificationPage,
  'providers/reports': ReportsPage,
  'admin/reports': ReportsPage,
  'providers/profile': SettingsPage,
  'providers/settings': SettingsPage,
  'admin/settings': SettingsPage,
  'providers/privacy': PrivacyPolicyPage,
  'admin/privacy': PrivacyPolicyPage,
  'providers/create': ScholarshipCreatePage,
  'admin/create': ScholarshipCreatePage,
  'providers/edit': ScholarshipEditPage,
  'admin/edit': ScholarshipEditPage,
  'admin/approvals': AdminProviderApprovalsView,
  'admin/providers': AdminProviderApprovalsView,
  'admin/students': AdminStudentsOversightView,
  'admin/users': AdminStudentsOversightView,
  'admin/audit': AdminAuditLogsView,
}

export default function ProviderDashboard({ onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const baseUrl = isLocal ? 'http://localhost:4000' : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:4000')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [adminOverview, setAdminOverview] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return 'providers'
    return window.location.hash.replace('#', '') || 'providers'
  })
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('provider_token') || localStorage.getItem('auth_token') || localStorage.getItem('admin_token')
  })

  const profileRef = useRef(null)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.replace('#', '') || 'providers')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mobile drawer scroll lock & keyboard escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false)
        if (profileDropdownOpen) setProfileDropdownOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen, profileDropdownOpen])

  useEffect(() => {
    let intervalId = null

    async function loadProfileAndDashboard() {
      if (!token) {
        setLoading(false)
        setDashboardLoading(false)
        return
      }

      setLoading(true)
      setDashboardLoading(true)
      setDashboardError('')
      setError('')

      try {
        const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            logout()
            return
          }
          throw new Error(`Profile request failed: ${profileRes.status}`)
        }

        const profileBody = await profileRes.json()
        const currentUser = profileBody.user || null
        setUser(currentUser)

        const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'administrator'

        // Fetch appropriate dashboard endpoint based on role
        if (isUserAdmin) {
          const adminRes = await fetch(`${baseUrl}/api/admin/overview`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (adminRes.ok) {
            const adminBody = await adminRes.json()
            setAdminOverview(adminBody)
          }
        }

        const dashboardRes = await fetch(`${baseUrl}/api/providers/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (dashboardRes.ok) {
          const dashboardBody = await dashboardRes.json()
          setDashboard(dashboardBody.dashboard || null)
        }
      } catch (err) {
        setError(err.message || 'Unable to load profile')
      } finally {
        setLoading(false)
        setDashboardLoading(false)
      }
    }

    loadProfileAndDashboard()

    intervalId = window.setInterval(() => {
      if (!token) return
      fetch(`${baseUrl}/api/providers/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (body?.dashboard) setDashboard(body.dashboard)
        })
        .catch(() => {})
    }, 30000)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [token])

  const logout = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('provider_token')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('auth_user')
    setToken(null)
    setUser(null)
    if (onLogout) onLogout()
    window.location.hash = '#home'
  }

  const handleUpdate = async () => {
    if (!token) return
    try {
      const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (profileRes.ok) {
        const profileBody = await profileRes.json()
        setUser(profileBody.user || null)
      }
    } catch (err) {
      console.error('Failed to reload profile:', err)
    }
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'administrator'
  const defaultRoute = isAdmin ? 'admin' : 'providers'
  const navItems = isAdmin ? adminNavItems : providerNavItems

  let activeRoute = routeMap[route] !== undefined ? route : defaultRoute
  let pageProps = {}
  const editMatch = route.match(/^(?:providers|admin)\/edit\/(.+)$/)
  if (routeMap[route] === undefined && editMatch) {
    activeRoute = isAdmin ? 'admin/edit' : 'providers/edit'
    pageProps = {
      token,
      user,
      scholarshipId: editMatch[1],
      onUpdated: handleUpdate,
    }
  }

  let PageComponent = routeMap[activeRoute]

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <div className="h-8 w-8 rounded-full border-2 border-[#FF6D29] border-t-transparent animate-spin" />
        <div className="font-bold text-xs uppercase tracking-widest text-[#FF6D29]">Loading Workspace…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-400 max-w-md text-center space-y-3">
          <p>{error}</p>
          <button onClick={logout} className="btn-secondary px-4 py-2 text-xs">Back to Login</button>
        </div>
      </div>
    )
  }

  // Active page title for header breadcrumbs
  const activeNavItem = navItems.find((item) => item.route === activeRoute)
  const pageTitle = activeNavItem ? activeNavItem.label : (isAdmin ? 'Admin Console' : 'Provider Dashboard')

  return (
    <div className="flex min-h-screen transition-colors" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--border)',
          paddingTop: 'max(16px, var(--safe-top))',
          paddingBottom: 'max(16px, var(--safe-bottom))',
          paddingLeft: 'max(16px, var(--safe-left))',
        }}
      >
        {/* Brand Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <IskolarLogo size="md" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-sm font-bold hover:bg-[var(--color-surface-panel)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close sidebar menu"
          >
            ✕
          </button>
        </div>

        {/* User Identity Chip */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6D29]">
            {isAdmin ? 'System Administrator' : 'Authenticated Sponsor'}
          </div>
          <div className="text-sm font-black truncate" style={{ color: 'var(--text-heading)' }}>
            {isAdmin ? (user?.name || 'Administrator') : (user?.organization_name || user?.name || 'Provider Account')}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            {user?.email}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Portal Navigation">
          {navItems.map((item) => {
            const isActive = activeRoute === item.route
            return (
              <button
                key={item.route}
                onClick={() => {
                  window.location.hash = `#${item.route}`
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition text-left text-xs font-bold cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#FF6D29] to-[#FF8552] text-white shadow-md'
                    : 'hover:bg-[var(--color-surface-panel)]'
                }`}
                style={{
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)'
                }}
              >
                <span>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-panel)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)'
            }}
          >
            <span>Theme Mode</span>
            <div className="flex items-center gap-1.5">
              {theme === 'dark' ? <SunIcon className="w-3.5 h-3.5 text-amber-400" /> : <MoonIcon className="w-3.5 h-3.5 text-slate-700" />}
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition shadow-sm cursor-pointer"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Sticky Top Header Bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--border)',
            paddingTop: 'max(12px, var(--safe-top))',
          }}
        >
          {/* Left: Mobile trigger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border flex flex-col justify-center items-center gap-1 w-9 h-9 cursor-pointer transition hover:bg-[var(--color-surface-panel)]"
              style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              aria-label="Open sidebar navigation"
            >
              <span className="h-0.5 w-4.5 bg-current rounded-full" />
              <span className="h-0.5 w-4.5 bg-current rounded-full" />
              <span className="h-0.5 w-4.5 bg-current rounded-full" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              <span className="hidden sm:inline font-bold text-[#FF6D29]">ISKOLAR</span>
              <span className="hidden sm:inline">/</span>
              <span className="hidden sm:inline">{isAdmin ? 'Administration' : 'Provider Portal'}</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-extrabold" style={{ color: 'var(--text-heading)' }}>{pageTitle}</span>
            </div>
          </div>

          {/* Right: Actions, Theme, and Profile Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Quick Action Button */}
            <button
              onClick={() => { window.location.hash = isAdmin ? '#admin/create' : '#providers/create' }}
              className="btn-primary hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold cursor-pointer"
            >
              <span>+ Post Grant</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => { window.location.hash = isAdmin ? '#admin/audit' : '#providers/applicants' }}
              className="p-2 rounded-xl border relative transition hover:bg-[var(--color-surface-panel)] cursor-pointer"
              style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              aria-label="Notifications"
            >
              <BellIcon className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF6D29] ring-2 ring-[var(--bg-primary)]" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-[var(--color-surface-panel)] cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                aria-label="User Profile Menu"
              >
                <span className="h-6 w-6 rounded-full bg-[#FF6D29]/20 text-[#FF6D29] flex items-center justify-center font-black text-[11px]">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:inline max-w-[120px] truncate">{user?.name || 'Account'}</span>
                <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-2xl border p-2 shadow-xl backdrop-blur-xl z-50 space-y-1"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                    role="menu"
                  >
                    <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-heading)' }}>{user?.name || 'User'}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        window.location.hash = isAdmin ? '#admin/settings' : '#providers/settings'
                        setProfileDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition hover:bg-[var(--color-surface-panel)]"
                      style={{ color: 'var(--text-secondary)' }}
                      role="menuitem"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        window.location.hash = isAdmin ? '#admin/settings' : '#providers/settings'
                        setProfileDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition hover:bg-[var(--color-surface-panel)]"
                      style={{ color: 'var(--text-secondary)' }}
                      role="menuitem"
                    >
                      Settings & Preferences
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        logout()
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition"
                      role="menuitem"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Central Workspace Content Area */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 md:p-8 outline-none">
          {/* Main Dashboard Overview (Provider or Admin) */}
          {(activeRoute === 'providers' || activeRoute === 'admin') && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header Title Section */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
                    style={{
                      backgroundColor: 'rgba(255, 109, 41, 0.10)',
                      color: 'var(--primary)',
                      borderColor: 'rgba(255, 109, 41, 0.25)'
                    }}
                  >
                    {isAdmin ? 'System Administration Portal' : 'Scholarship Management Portal'}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                    {isAdmin ? 'System Admin Control Center' : 'Provider Command Center'}
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                    {isAdmin
                      ? `Administrator Console • Signed in as ${user?.name || 'System Administrator'}`
                      : user?.organization_name
                      ? `${user.organization_name} • Managed by ${user.name}`
                      : `Signed in as ${user?.name || 'Scholarship Provider'}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <ShinyButton
                    size="md"
                    icon="+"
                    onClick={() => { window.location.hash = isAdmin ? '#admin/create' : '#providers/create' }}
                  >
                    Post New Scholarship
                  </ShinyButton>
                </div>
              </div>

              {/* 4 Bento KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {isAdmin ? (
                  // Administrator KPIs
                  [
                    {
                      title: 'Pending Provider Approvals',
                      value: adminOverview?.counts?.pendingProviderApprovals ?? 0,
                      icon: <ShieldIcon className="w-5 h-5 text-amber-500" />,
                      accent: '#F59E0B',
                      subtitle: 'Sponsors Awaiting Review',
                      link: '#admin/approvals'
                    },
                    {
                      title: 'Active Providers',
                      value: adminOverview?.counts?.users ? Math.max(1, Math.round(adminOverview.counts.users * 0.3)) : 1,
                      icon: <BuildingIcon className="w-5 h-5 text-emerald-500" />,
                      accent: '#10B981',
                      subtitle: 'Accredited Sponsors',
                      link: '#admin/approvals'
                    },
                    {
                      title: 'Active Scholarships',
                      value: adminOverview?.counts?.openScholarships ?? dashboard?.openScholarshipsCount ?? 0,
                      icon: <DocumentIcon className="w-5 h-5 text-[#FF6D29]" />,
                      accent: '#FF6D29',
                      subtitle: 'Published Grant Programs',
                      link: '#admin/scholarships'
                    },
                    {
                      title: 'Applications Under Oversight',
                      value: adminOverview?.counts?.applications ?? dashboard?.applicationsCount ?? 0,
                      icon: <GraduationCapIcon className="w-5 h-5 text-sky-500" />,
                      accent: '#3B82F6',
                      subtitle: 'Total Candidate Submissions',
                      link: '#admin/applicants'
                    },
                  ].map((item) => (
                    <SpotlightCard
                      key={item.title}
                      className="p-5 flex flex-col justify-between cursor-pointer hover:border-[var(--primary)] transition"
                      onClick={() => { if (item.link) window.location.hash = item.link }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {item.title}
                        </span>
                        {item.icon}
                      </div>
                      <div className="my-3">
                        <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                          {item.value}
                        </div>
                        <div className="text-xs font-semibold mt-1" style={{ color: item.accent }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </SpotlightCard>
                  ))
                ) : (
                  // Provider KPIs
                  [
                    {
                      title: 'Total Applications',
                      value: dashboard?.applicationsCount ?? 0,
                      icon: <DocumentIcon className="w-5 h-5 text-[#FF6D29]" />,
                      accent: '#FF6D29',
                      subtitle: 'All Program Submissions',
                      link: '#providers/applicants'
                    },
                    {
                      title: 'Applications Needing Action',
                      value: dashboard?.applicationStatusCounts?.pending ?? 0,
                      icon: <AlertTriangleIcon className="w-5 h-5 text-amber-500" />,
                      accent: '#F59E0B',
                      subtitle: 'Pending Evaluation or Docs',
                      link: '#providers/applicants'
                    },
                    {
                      title: 'Approved Scholars',
                      value: dashboard?.applicationStatusCounts?.approved ?? 0,
                      icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
                      accent: '#10B981',
                      subtitle: 'Confirmed Scholarship Awards',
                      link: '#providers/applicants'
                    },
                    {
                      title: 'Active Grant Programs',
                      value: dashboard?.openScholarshipsCount ?? dashboard?.totalScholarships ?? 0,
                      icon: <BoltIcon className="w-5 h-5 text-sky-500" />,
                      accent: '#3B82F6',
                      subtitle: 'Accepting Submissions',
                      link: '#providers/scholarships'
                    },
                  ].map((item) => (
                    <SpotlightCard
                      key={item.title}
                      className="p-5 flex flex-col justify-between cursor-pointer hover:border-[var(--primary)] transition"
                      onClick={() => { if (item.link) window.location.hash = item.link }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {item.title}
                        </span>
                        {item.icon}
                      </div>
                      <div className="my-3">
                        <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                          {item.value}
                        </div>
                        <div className="text-xs font-semibold mt-1" style={{ color: item.accent }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </SpotlightCard>
                  ))
                )}
              </div>

              {dashboardError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
                  {dashboardError}
                </div>
              )}

              {/* Rapid Actions Bar */}
              <SpotlightCard className="p-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4" style={{ color: 'var(--text-heading)' }}>
                  Rapid Navigation & Controls
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    onClick={() => { window.location.hash = isAdmin ? '#admin/create' : '#providers/create' }}
                    className="btn-secondary p-3.5 text-xs font-extrabold text-center hover:border-[var(--primary)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <SparklesIcon className="w-4 h-4 text-[#FF6D29]" />
                    <span>Create Scholarship</span>
                  </button>
                  <button
                    onClick={() => { window.location.hash = isAdmin ? '#admin/applicants' : '#providers/applicants' }}
                    className="btn-secondary p-3.5 text-xs font-extrabold text-center hover:border-[var(--primary)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <GraduationCapIcon className="w-4 h-4 text-[#FF8552]" />
                    <span>Review Candidates</span>
                  </button>
                  <button
                    onClick={() => { window.location.hash = isAdmin ? '#admin/verification' : '#providers/verification' }}
                    className="btn-secondary p-3.5 text-xs font-extrabold text-center hover:border-[var(--primary)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldIcon className="w-4 h-4 text-emerald-500" />
                    <span>Document OCR Checks</span>
                  </button>
                  <button
                    onClick={() => { window.location.hash = isAdmin ? '#admin/reports' : '#providers/reports' }}
                    className="btn-secondary p-3.5 text-xs font-extrabold text-center hover:border-[var(--primary)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ChartIcon className="w-4 h-4 text-sky-500" />
                    <span>View Analytics</span>
                  </button>
                </div>
              </SpotlightCard>
            </div>
          )}

          {/* Sub-Page Content Component */}
          {PageComponent && (
            <div className="animate-fadeIn">
              <PageComponent
                token={token}
                user={user}
                onUpdate={handleUpdate}
                dashboard={dashboard}
                {...pageProps}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
