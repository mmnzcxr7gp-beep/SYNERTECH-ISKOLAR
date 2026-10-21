import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  ChevronRightIcon,
  ArrowRightIcon,
  EditIcon,
  RefreshIcon,
  XIcon,
  ExternalLinkIcon
} from './Icons'
const ApplicantsPage = React.lazy(() => import('./ApplicantsPage'))
const ScholarshipCreatePage = React.lazy(() => import('./ScholarshipCreatePage'))
const ScholarshipsPage = React.lazy(() => import('./ScholarshipsPage'))
const ScholarshipEditPage = React.lazy(() => import('./ScholarshipEditPage'))
const ReportsPage = React.lazy(() => import('./ReportsPage'))
const SettingsPage = React.lazy(() => import('./SettingsPage'))
const SchedulingPage = React.lazy(() => import('./SchedulingPage'))
const DocumentVerificationPage = React.lazy(() => import('./DocumentVerificationPage'))
const PrivacyPolicyPage = React.lazy(() => import('./PrivacyPolicyPage'))
import NotificationCenter from './NotificationCenter'
import AdminAccountDetailModal from './AdminAccountDetailModal'
import AccountActionsMenu from './AccountActionsMenu'
import { API_BASE_URL } from '../config/api'

// Purpose-Grouped Provider Navigation
const providerNavGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Desk Overview', icon: <SparklesIcon className="w-4 h-4" />, route: 'providers' },
    ],
  },
  {
    title: 'Programs',
    items: [
      { label: 'My Scholarships', icon: <DocumentIcon className="w-4 h-4" />, route: 'providers/scholarships' },
      { label: 'Create Scholarship', icon: <EditIcon className="w-4 h-4" />, route: 'providers/create' },
    ],
  },
  {
    title: 'Applications',
    items: [
      { label: 'Applicant Pipeline', icon: <GraduationCapIcon className="w-4 h-4" />, route: 'providers/applicants' },
    ],
  },
  {
    title: 'Evaluations',
    items: [
      { label: 'Document & OCR Checks', icon: <ShieldIcon className="w-4 h-4" />, route: 'providers/verification' },
      { label: 'Interview & Exam Scheduling', icon: <CalendarIcon className="w-4 h-4" />, route: 'providers/scheduling' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Analytics & Ledger', icon: <ChartIcon className="w-4 h-4" />, route: 'providers/reports' },
    ],
  },
  {
    title: 'Organization & Security',
    items: [
      { label: 'Profile & Settings', icon: <BuildingIcon className="w-4 h-4" />, route: 'providers/settings' },
      { label: 'Data Privacy Policy', icon: <LockIcon className="w-4 h-4" />, route: 'providers/privacy' },
    ],
  },
]

// Purpose-Grouped Administrator Navigation
const adminNavGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Admin Desk Overview', icon: <SparklesIcon className="w-4 h-4" />, route: 'admin' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Provider Approvals', icon: <ShieldIcon className="w-4 h-4" />, route: 'admin/approvals' },
      { label: 'Users & Student Oversight', icon: <UsersIcon className="w-4 h-4" />, route: 'admin/students' },
    ],
  },
  {
    title: 'Platform Records',
    items: [
      { label: 'All System Scholarships', icon: <DocumentIcon className="w-4 h-4" />, route: 'admin/scholarships' },
      { label: 'Applications Oversight', icon: <GraduationCapIcon className="w-4 h-4" />, route: 'admin/applicants' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Audit Logs', icon: <HistoryIcon className="w-4 h-4" />, route: 'admin/audit' },
      { label: 'Document Verification', icon: <ShieldIcon className="w-4 h-4" />, route: 'admin/verification' },
      { label: 'Interview Schedules', icon: <CalendarIcon className="w-4 h-4" />, route: 'admin/scheduling' },
    ],
  },
  {
    title: 'Reports & Settings',
    items: [
      { label: 'System Reports', icon: <ChartIcon className="w-4 h-4" />, route: 'admin/reports' },
      { label: 'System Health & Settings', icon: <LockIcon className="w-4 h-4" />, route: 'admin/settings' },
    ],
  },
]

// Flattened lookup for breadcrumbs
const providerNavItems = providerNavGroups.flatMap((g) => g.items)
const adminNavItems = adminNavGroups.flatMap((g) => g.items)

// -------------------------------------------------------------
// Admin Sub-Views: Provider Approvals, Students, and Audit Logs
// -------------------------------------------------------------
function AdminProviderApprovalsView({ token }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'verified'
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [modalInitialTab, setModalInitialTab] = useState('overview')
  const [modalInitialAction, setModalInitialAction] = useState(null)

  const loadProviders = async () => {
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
    loadProviders()
  }, [token])

  const filteredProviders = providers.filter((p) => {
    const accStatus = p.accountStatus || (p.isDeleted ? 'DELETION_PENDING' : p.isSuspended ? 'SUSPENDED' : 'ACTIVE')
    const isRejected = accStatus === 'REJECTED' || p.verificationStatus === 'rejected'
    const isVerified = isRejected ? false : (p.sponsor_verified && p.organization_verified)

    if (filter === 'pending') return (!isVerified && !isRejected && accStatus !== 'SUSPENDED')
    if (filter === 'verified') return isVerified
    if (filter === 'rejected') return isRejected
    return true
  })

  const handleViewAccount = (prov, tab = 'overview') => {
    setSelectedAccountId(prov.id)
    setModalInitialTab(tab)
    setModalInitialAction(null)
  }

  const handleTriggerAction = (prov, actionName) => {
    setSelectedAccountId(prov.id)
    if (actionName === 'edit') {
      setModalInitialTab('overview')
      setModalInitialAction('edit')
    } else {
      setModalInitialTab('actions')
      setModalInitialAction(actionName)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(48, 91, 254, 0.10)',
            color: '#305BFE',
            borderColor: 'rgba(48, 91, 254, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Provider Verification & Directory
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Audit scholarship sponsor credentials, inspect submitted grant programs, verify corporate registration, and manage accounts with contextual actions.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: `All Providers (${providers.length})` },
          { id: 'pending', label: `Pending Review (${providers.filter(p => (!p.sponsor_verified || !p.organization_verified) && p.accountStatus !== 'REJECTED' && p.verificationStatus !== 'rejected' && p.accountStatus !== 'SUSPENDED').length})` },
          { id: 'verified', label: `Fully Verified (${providers.filter(p => p.sponsor_verified && p.organization_verified && p.accountStatus !== 'REJECTED').length})` },
          { id: 'rejected', label: `Rejected (${providers.filter(p => p.accountStatus === 'REJECTED' || p.verificationStatus === 'rejected').length})` },
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
        <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading provider records…</div>
      ) : filteredProviders.length === 0 ? (
        <SpotlightCard className="p-12 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            No providers found matching the selected filter.
          </p>
        </SpotlightCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left">
            <thead className="border-b" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Role</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Verification Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Account Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Registration Date</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filteredProviders.map((prov) => {
                const regDate = prov.created_at || prov.createdAt
                  ? new Date(prov.created_at || prov.createdAt).toLocaleDateString()
                  : 'N/A'
                const accStatus = prov.accountStatus || (prov.isDeleted ? 'DELETION_PENDING' : prov.isSuspended ? 'SUSPENDED' : 'ACTIVE')
                const isRejected = accStatus === 'REJECTED' || prov.verificationStatus === 'rejected'
                const isVerified = isRejected ? false : (prov.sponsor_verified && prov.organization_verified)

                return (
                  <tr
                    key={prov.id}
                    onClick={() => handleViewAccount(prov, 'overview')}
                    className="transition hover:bg-[#305BFE]/10 cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 text-xs font-bold group-hover:text-[#305BFE] transition" style={{ color: 'var(--text-heading)' }}>
                      <div>{prov.name || prov.company || `Provider #${prov.id}`}</div>
                      {prov.company && <div className="text-[10px] text-slate-400 font-normal">{prov.company}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {prov.email}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-white border border-white/20">
                        {prov.role || 'Provider'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isRejected
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isVerified
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {isRejected ? 'Rejected' : isVerified ? 'Verified' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        accStatus === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : (accStatus === 'SUSPENDED' || accStatus === 'REJECTED')
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : accStatus === 'ARCHIVED'
                          ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {accStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {regDate}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleViewAccount(prov, 'overview')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90 transition cursor-pointer shadow-sm"
                        >
                          View
                        </button>
                        <AccountActionsMenu
                          account={{ ...prov, role: prov.role || 'provider' }}
                          onViewAccount={handleViewAccount}
                          onTriggerAction={handleTriggerAction}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Account Detail & Lifecycle Control Modal */}
      <AdminAccountDetailModal
        accountId={selectedAccountId}
        isOpen={!!selectedAccountId}
        onClose={() => { setSelectedAccountId(null); setModalInitialAction(null); }}
        token={token}
        onAccountUpdated={loadProviders}
        initialTab={modalInitialTab}
        initialActionDialog={modalInitialAction}
      />
    </div>
  )
}

function AdminStudentsOversightView({ token }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [modalInitialTab, setModalInitialTab] = useState('overview')
  const [modalInitialAction, setModalInitialAction] = useState(null)

  const loadStudents = async () => {
    setLoading(true)
    setError('')
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

  useEffect(() => {
    loadStudents()
  }, [token])

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    const matchQuery =
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.schoolName || s.school || '').toLowerCase().includes(q) ||
      (s.course || '').toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)

    if (!matchQuery) return false

    const accStatus = s.accountStatus || (s.isDeleted ? 'DELETION_PENDING' : s.isSuspended ? 'SUSPENDED' : 'ACTIVE')
    const isRejected = accStatus === 'REJECTED' || s.verificationStatus === 'rejected'
    const isVerified = isRejected ? false : Boolean(s.isVerified && accStatus === 'ACTIVE')

    if (statusFilter === 'ACTIVE') return accStatus === 'ACTIVE' && isVerified
    if (statusFilter === 'PENDING') return (accStatus === 'PENDING_ADMIN_REVIEW' || !isVerified) && accStatus !== 'SUSPENDED' && !isRejected
    if (statusFilter === 'SUSPENDED') return accStatus === 'SUSPENDED' || s.isSuspended
    if (statusFilter === 'REJECTED') return isRejected

    return true
  })

  const handleViewAccount = (st, tab = 'overview') => {
    setSelectedAccountId(st.id)
    setModalInitialTab(tab)
    setModalInitialAction(null)
  }

  const handleTriggerAction = (st, actionName) => {
    setSelectedAccountId(st.id)
    if (actionName === 'edit') {
      setModalInitialTab('overview')
      setModalInitialAction('edit')
    } else {
      setModalInitialTab('actions')
      setModalInitialAction(actionName)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(48, 91, 254, 0.10)',
            color: '#305BFE',
            borderColor: 'rgba(48, 91, 254, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Student Candidate Oversight
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Monitor registered applicant profiles, verify school credentials, inspect submitted scholarship applications and documents, and manage account lifecycles.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student candidates by name, email, LRN, degree course, or school..."
          className="w-full flex-1 rounded-xl border p-3 text-xs font-medium focus:outline-none"
          style={{
            backgroundColor: 'var(--color-surface-panel)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)'
          }}
        />

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All (${students.length})` },
            { id: 'ACTIVE', label: 'Active / Verified' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'SUSPENDED', label: 'Suspended' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'hover:bg-[var(--color-surface-panel)]'
              }`}
              style={{
                backgroundColor: statusFilter === tab.id ? 'var(--primary)' : 'var(--color-surface-panel)',
                borderColor: statusFilter === tab.id ? 'var(--primary)' : 'var(--border)',
                color: statusFilter === tab.id ? '#FFFFFF' : 'var(--text-secondary)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading student records…</div>
      ) : filtered.length === 0 ? (
        <SpotlightCard className="p-8 text-center">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>No student records found matching search or filter.</p>
        </SpotlightCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left">
            <thead className="border-b" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Role</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Verification Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Account Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Registration Date</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map((st) => {
                const regDate = st.created_at || st.createdAt
                  ? new Date(st.created_at || st.createdAt).toLocaleDateString()
                  : 'N/A'
                const accStatus = st.accountStatus || (st.isDeleted ? 'DELETION_PENDING' : st.isSuspended ? 'SUSPENDED' : 'ACTIVE')
                const isRejected = accStatus === 'REJECTED' || st.verificationStatus === 'rejected'
                const isVerified = isRejected ? false : Boolean(st.isVerified && accStatus === 'ACTIVE')

                return (
                  <tr
                    key={st.id}
                    onClick={() => handleViewAccount(st, 'overview')}
                    className="transition hover:bg-[#305BFE]/10 cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 text-xs font-bold group-hover:text-[#305BFE] transition" style={{ color: 'var(--text-heading)' }}>
                      <div>{st.name || `Student #${st.id}`}</div>
                      {(st.schoolName || st.school) && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {st.schoolName || st.school} {st.course ? `• ${st.course}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {st.email}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-white border border-white/20">
                        {st.role || 'Student'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        isRejected
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isVerified
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {isRejected ? 'Rejected' : isVerified ? 'Verified' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        accStatus === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : (accStatus === 'SUSPENDED' || accStatus === 'REJECTED')
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : accStatus === 'ARCHIVED'
                          ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {accStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {regDate}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleViewAccount(st, 'overview')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90 transition cursor-pointer shadow-sm"
                        >
                          View
                        </button>
                        <AccountActionsMenu
                          account={{ ...st, role: st.role || 'student' }}
                          onViewAccount={handleViewAccount}
                          onTriggerAction={handleTriggerAction}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Account Detail & Lifecycle Control Modal */}
      <AdminAccountDetailModal
        accountId={selectedAccountId}
        isOpen={!!selectedAccountId}
        onClose={() => { setSelectedAccountId(null); setModalInitialAction(null); }}
        token={token}
        onAccountUpdated={loadStudents}
        initialTab={modalInitialTab}
        initialActionDialog={modalInitialAction}
      />
    </div>
  )
}

function AdminAuditLogsView({ token }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

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

  const getActionDescription = (action) => {
    const a = String(action || '').toUpperCase()
    if (a.includes('VERIFY')) return 'Verified user account or submitted credentials after human administrative review.'
    if (a.includes('REJECT')) return 'Rejected registration or verification submission with administrative reason recording.'
    if (a.includes('REVOKE') || a.includes('SESSION')) return 'Revoked active session tokens and invalidated bearer authorization keys.'
    if (a.includes('REACTIVATE')) return 'Restored suspended account status to active operational standing.'
    if (a.includes('SUSPEND')) return 'Suspended account due to compliance, security flag, or administrative request.'
    if (a.includes('FILE_ACCESS') || a.includes('DOWNLOAD')) return 'Authorized confidential document preview and decrypted download stream.'
    if (a.includes('STATUS_UPDATE') || a.includes('DOCUMENT')) return 'Updated document verification pipeline status and recorded OCR validation flags.'
    return 'System-recorded administrative security event.'
  }

  return (
    <div className="w-full space-y-6">
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(48, 91, 254, 0.10)',
            color: '#305BFE',
            borderColor: 'rgba(48, 91, 254, 0.25)'
          }}
        >
          Administrator Control
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Security & System Audit Logs
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Immutable ledger of system events, authentication, human decisions, and data access. Click any row to inspect full event payload.
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
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-secondary)' }}>Action Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {logs.map((log, idx) => (
                <tr
                  key={log._id || idx}
                  onClick={() => setSelectedLog(log)}
                  className="transition hover:bg-[var(--color-surface-panel)] cursor-pointer group"
                >
                  <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt || log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-bold" style={{ color: 'var(--primary)' }}>
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <ShieldIcon className="w-3.5 h-3.5 opacity-80" />
                      {log.action || log.event || 'SYSTEM_ACTION'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium" style={{ color: 'var(--text-heading)' }}>
                    {log.actorUserId?.email || log.actorEmail || log.actorRole || 'System Administrator'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLog(log)
                      }}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition group-hover:border-[#305BFE] group-hover:text-[#305BFE]"
                      style={{
                        backgroundColor: 'var(--color-surface-panel)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedLog && (
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
              }}
              onClick={() => setSelectedLog(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left my-auto"
                style={{
                  backgroundColor: '#131B2A',
                  borderColor: '#1E293B',
                  color: '#F1F5F9',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
                }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#305BFE]/15 text-[#305BFE] border border-[#305BFE]/30">
                      Audit Event Record
                    </span>
                    <h3 className="text-base font-black mt-1 font-mono text-white">
                      {selectedLog.action || selectedLog.event || 'SYSTEM_ACTION'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {new Date(selectedLog.createdAt || selectedLog.timestamp || Date.now()).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Event Description */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs leading-relaxed text-slate-200">
                  <div className="font-bold text-[10px] uppercase text-slate-400 mb-1">Event Summary</div>
                  <p className="text-xs text-white leading-normal">
                    {getActionDescription(selectedLog.action || selectedLog.event)}
                  </p>
                </div>

                {/* Actor & Target Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Performed By (Actor)</div>
                    <div className="font-bold text-white mt-0.5 truncate">
                      {selectedLog.actorUserId?.email || selectedLog.actorEmail || selectedLog.actorRole || 'System'}
                    </div>
                    <div className="text-[10px] text-slate-400">Role: {selectedLog.actorRole || 'admin'}</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Target Entity / User</div>
                    <div className="font-bold text-white mt-0.5 truncate">
                      {selectedLog.targetUserId || selectedLog.details?.targetUserId || selectedLog.details?.email || 'N/A'}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Status: Confirmed</div>
                  </div>
                </div>

                {/* Payload Metadata */}
                <div className="p-3 rounded-xl border border-slate-800 bg-black/60 font-mono text-[11px] space-y-1 overflow-x-auto">
                  <div className="font-bold text-[10px] uppercase text-[#305BFE]">Raw Event Details & Context</div>
                  <pre className="text-[10px] text-slate-300 leading-relaxed">
                    {JSON.stringify(selectedLog.details || selectedLog, null, 2)}
                  </pre>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#305BFE] text-white hover:brightness-110 shadow-lg cursor-pointer transition"
                  >
                    Close Inspection
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
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
  const baseUrl = API_BASE_URL
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
    const cleanHash = window.location.hash.replace(/^#[/]?/, '').trim().toLowerCase()
    return cleanHash || 'providers'
  })
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('provider_token') || localStorage.getItem('auth_token') || localStorage.getItem('admin_token')
  })

  const profileRef = useRef(null)

  useEffect(() => {
    const handleHashChange = () => {
      const cleanHash = window.location.hash.replace(/^#[/]?/, '').trim().toLowerCase()
      setRoute(cleanHash || 'providers')
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

  const resilientFetch = async (endpoint, options = {}) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const isProdHost = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    const safeBase = (isProdHost && (baseUrl || '').includes('localhost')) ? '' : (baseUrl || '')

    // Primary attempt: configured API base + endpoint
    try {
      const res = await fetch(`${safeBase}${cleanEndpoint}`, options)
      // Accept all non-server-error responses (including 401, 403, 404) as valid
      if (res.status < 500) return res
    } catch (err) {
      // Network error — cascade to same-origin fallback
    }

    // Same-origin proxy fallback (works on Vercel / iskolar.org via rewrite rules)
    // Only attempted on network failure or 5xx from primary
    try {
      const res = await fetch(cleanEndpoint, options)
      if (res.status < 500) return res
    } catch (err) {
      // Both attempts failed — rethrow so callers see the error
      throw new Error(`Network error: unable to reach API for ${cleanEndpoint}`)
    }

    // If same-origin returned 5xx, still return it so callers can handle the status
    throw new Error(`Server error: API unavailable for ${cleanEndpoint}`)
  }

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
        const profileRes = await resilientFetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            // Session invalid or expired — force re-login
            logout()
            return
          }
          if (profileRes.status === 403) {
            // Valid session but access denied for this role/resource
            setError('Access denied. Your account may not have permission for this workspace.')
            setLoading(false)
            setDashboardLoading(false)
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
          const adminRes = await resilientFetch('/api/admin/overview', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (adminRes.ok) {
            const adminBody = await adminRes.json()
            setAdminOverview(adminBody)
          }
        }

        const dashboardRes = await resilientFetch('/api/providers/dashboard', {
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
      resilientFetch('/api/providers/dashboard', {
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
      const profileRes = await resilientFetch('/api/auth/me', {
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

  // Normalize route and fallback if unprefixed (e.g. #scholarships -> #providers/scholarships or #admin/scholarships)
  let resolvedRoute = route
  if (routeMap[resolvedRoute] === undefined) {
    const candidate = `${isAdmin ? 'admin' : 'providers'}/${route}`
    if (routeMap[candidate] !== undefined) {
      resolvedRoute = candidate
    }
  }

  let activeRoute = routeMap[resolvedRoute] !== undefined ? resolvedRoute : defaultRoute
  let pageProps = {}
  const editMatch = resolvedRoute.match(/^(?:providers|admin)\/edit\/(.+)$/)
  if (routeMap[resolvedRoute] === undefined && editMatch) {
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
        <div className="h-8 w-8 rounded-full border-2 border-[#305BFE] border-t-transparent animate-spin" />
        <div className="font-bold text-xs uppercase tracking-widest text-[#305BFE]">Loading Workspace…</div>
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
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#305BFE]">
            {isAdmin ? 'System Administrator' : 'Authenticated Sponsor'}
          </div>
          <div className="text-sm font-black truncate" style={{ color: 'var(--text-heading)' }}>
            {isAdmin ? (user?.name || 'Administrator') : (user?.organization_name || user?.name || 'Provider Account')}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            {user?.email}
          </div>
        </div>

        {/* Purpose-Grouped Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto" aria-label="Portal Navigation">
          {(isAdmin ? adminNavGroups : providerNavGroups).map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted,#8F9CAE)]">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeRoute === item.route
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => {
                        window.location.hash = `#${item.route}`
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left text-xs font-semibold cursor-pointer ${
                        isActive
                          ? 'bg-[#305BFE] text-white shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-heading)]'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-[#305BFE]'}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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
              <span className="hidden sm:inline font-bold text-[#305BFE]">ISKOLAR</span>
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

            {/* Notification Center */}
            <NotificationCenter token={token} isAdmin={isAdmin} />

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
                <span className="h-6 w-6 rounded-full bg-[#305BFE]/20 text-[#305BFE] flex items-center justify-center font-black text-[11px]">
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
                      backgroundColor: 'rgba(48, 91, 254, 0.10)',
                      color: '#305BFE',
                      borderColor: 'rgba(48, 91, 254, 0.25)'
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

              {/* Dashboard Error Alert if any */}
              {dashboardError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
                  {dashboardError}
                </div>
              )}

              {/* Prioritized Workspace Content (Provider or Admin) */}
              {isAdmin ? (
                // ADMINISTRATOR DESK WORKSPACE
                <div className="space-y-8">
                  {/* 1. Pending Provider Approvals Queue */}
                  {(adminOverview?.counts?.pendingProviderApprovals || 0) > 0 ? (
                    <div
                      className="p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.06)',
                        borderColor: 'rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <AlertTriangleIcon className="w-3.5 h-3.5" />
                          Governance Action Required
                        </div>
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                          {adminOverview.counts.pendingProviderApprovals} Sponsor Organization{adminOverview.counts.pendingProviderApprovals > 1 ? 's' : ''} Awaiting Review
                        </h2>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Provider organizations have submitted registration credentials and require verification of legal standing and eligibility before publishing scholarship grants.
                        </p>
                      </div>
                      <button
                        onClick={() => { window.location.hash = '#admin/approvals' }}
                        className="btn-primary shrink-0 px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <span>Review Provider Registrations</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircleIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                            Provider Accreditation Queue Clear
                          </h3>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            All active scholarship providers have undergone identity and accreditation review.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { window.location.hash = '#admin/approvals' }}
                        className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                      >
                        Manage Accredited Sponsors →
                      </button>
                    </div>
                  )}

                  {/* 2. Platform Activity & Recent Candidate Submissions Under Oversight */}
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-heading)' }}>
                          Candidate Applications Under Oversight
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Live student submissions across all accredited scholarship programs
                        </p>
                      </div>
                      <button
                        onClick={() => { window.location.hash = '#admin/applicants' }}
                        className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                      >
                        View Full Pipeline →
                      </button>
                    </div>

                    {adminOverview?.recentApplications && adminOverview.recentApplications.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--color-surface-panel)' }}>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Applicant</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Scholarship Program</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Applied Date</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Status</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {adminOverview.recentApplications.slice(0, 6).map((app) => (
                              <tr key={app.id || app.applied_at} className="hover:bg-[var(--color-surface-panel)] transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold" style={{ color: 'var(--text-heading)' }}>
                                    {app.student?.name || 'Applicant'}
                                  </div>
                                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    {app.student?.email || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  {app.scholarship?.title || 'Scholarship'}
                                </td>
                                <td className="py-3 px-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                  {app.applied_at ? new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                      app.status === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : app.status === 'rejected'
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    {app.status || 'pending'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => { window.location.hash = '#admin/applicants' }}
                                    className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                                  >
                                    Inspect Dossier
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        No candidate applications recorded yet.
                      </div>
                    )}
                  </div>

                  {/* 3. Platform Governance & Operational Controls */}
                  <div
                    className="p-6 rounded-2xl border"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-heading)' }}>
                      Governance & Operational Controls
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        onClick={() => { window.location.hash = '#admin/approvals' }}
                        className="p-4 rounded-xl border text-left transition hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] cursor-pointer group"
                        style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <ShieldIcon className="w-5 h-5 text-amber-500" />
                          <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition" />
                        </div>
                        <div className="font-extrabold text-xs" style={{ color: 'var(--text-heading)' }}>Provider Accreditation</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Review sponsor legal status</div>
                      </button>

                      <button
                        onClick={() => { window.location.hash = '#admin/students' }}
                        className="p-4 rounded-xl border text-left transition hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] cursor-pointer group"
                        style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <UsersIcon className="w-5 h-5 text-[#305BFE]" />
                          <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition" />
                        </div>
                        <div className="font-extrabold text-xs" style={{ color: 'var(--text-heading)' }}>User Oversight</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage student and provider accounts</div>
                      </button>

                      <button
                        onClick={() => { window.location.hash = '#admin/audit' }}
                        className="p-4 rounded-xl border text-left transition hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] cursor-pointer group"
                        style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <HistoryIcon className="w-5 h-5 text-emerald-500" />
                          <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition" />
                        </div>
                        <div className="font-extrabold text-xs" style={{ color: 'var(--text-heading)' }}>Audit Ledger</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Security and role activity logs</div>
                      </button>

                      <button
                        onClick={() => { window.location.hash = '#admin/settings' }}
                        className="p-4 rounded-xl border text-left transition hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] cursor-pointer group"
                        style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <LockIcon className="w-5 h-5 text-sky-500" />
                          <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition" />
                        </div>
                        <div className="font-extrabold text-xs" style={{ color: 'var(--text-heading)' }}>System Health & Config</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Server status and security rules</div>
                      </button>
                    </div>
                  </div>

                  {/* 4. Supporting Institutional Metrics */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        title: 'Accredited Providers',
                        value: adminOverview?.counts?.users ? Math.max(1, Math.round(adminOverview.counts.users * 0.3)) : '—',
                        subtitle: 'Verified Grant Sponsors',
                        icon: <BuildingIcon className="w-4 h-4 text-[#305BFE]" />
                      },
                      {
                        title: 'Published Scholarships',
                        value: adminOverview?.counts?.openScholarships ?? dashboard?.openScholarshipsCount ?? '—',
                        subtitle: 'Active Grant Programs',
                        icon: <DocumentIcon className="w-4 h-4 text-emerald-500" />
                      },
                      {
                        title: 'Applications Under Oversight',
                        value: adminOverview?.counts?.applications ?? dashboard?.applicationsCount ?? '—',
                        subtitle: 'Total Candidate Dossiers',
                        icon: <GraduationCapIcon className="w-4 h-4 text-sky-500" />
                      },
                      {
                        title: 'Documents On Record',
                        value: adminOverview?.counts?.documents ?? '—',
                        subtitle: 'Encrypted Cloud Storage',
                        icon: <ShieldIcon className="w-4 h-4 text-amber-500" />
                      },
                    ].map((m) => (
                      <div
                        key={m.title}
                        className="p-4 rounded-2xl border"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {m.title}
                          </span>
                          {m.icon}
                        </div>
                        <div className="text-2xl font-black tracking-tight mt-2 tabular-nums" style={{ color: 'var(--text-heading)' }}>
                          {m.value}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {m.subtitle}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // PROVIDER DESK WORKSPACE
                <div className="space-y-8">
                  {/* 1. Actionable Review Queue (Work Requiring Attention) */}
                  {(dashboard?.applicationStatusCounts?.pending || 0) > 0 ? (
                    <div
                      className="p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      style={{
                        backgroundColor: 'rgba(48, 91, 254, 0.05)',
                        borderColor: 'rgba(48, 91, 254, 0.3)',
                      }}
                    >
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#305BFE]/15 text-[#305BFE] border border-[#305BFE]/25">
                          <AlertTriangleIcon className="w-3.5 h-3.5" />
                          Review Queue Action Needed
                        </div>
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                          {dashboard.applicationStatusCounts.pending} Candidate Application{dashboard.applicationStatusCounts.pending > 1 ? 's' : ''} Awaiting Desk Review
                        </h2>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Candidate dossiers have been submitted and require eligibility assessment, OCR document verification, or stage advancement.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={() => { window.location.hash = '#providers/applicants' }}
                          className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <span>Open Review Queue</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { window.location.hash = '#providers/verification' }}
                          className="btn-secondary px-3.5 py-2 text-xs font-bold cursor-pointer"
                        >
                          Document Checks
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircleIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                            Review Queue Is Clear
                          </h3>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            No pending candidate submissions or unverified student documents currently require your attention.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { window.location.hash = '#providers/applicants' }}
                        className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                      >
                        Browse All Applicants →
                      </button>
                    </div>
                  )}

                  {/* 2. Program Intake & Quota Breakdown */}
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-heading)' }}>
                          Active Program Intake & Capacity
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Real-time submission pipeline and scholar confirmation by grant program
                        </p>
                      </div>
                      <button
                        onClick={() => { window.location.hash = '#providers/scholarships' }}
                        className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                      >
                        All Programs ({dashboard?.totalScholarships ?? 0}) →
                      </button>
                    </div>

                    {dashboard?.topPrograms && dashboard.topPrograms.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--color-surface-panel)' }}>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Grant Program</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>Status</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Submissions</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>In Review</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>Awarded</th>
                              <th className="py-3 px-4 font-extrabold uppercase tracking-wider text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {dashboard.topPrograms.map((prog) => (
                              <tr key={prog.id} className="hover:bg-[var(--color-surface-panel)] transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold" style={{ color: 'var(--text-heading)' }}>
                                    {prog.title}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                      prog.status === 'open'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                    }`}
                                  >
                                    {prog.status || 'open'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {prog.applicants}
                                </td>
                                <td className="py-3 px-4 text-center tabular-nums font-semibold text-amber-500">
                                  {prog.pending}
                                </td>
                                <td className="py-3 px-4 text-center tabular-nums font-semibold text-emerald-500">
                                  {prog.approved}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => { window.location.hash = `#providers/applicants` }}
                                    className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer"
                                  >
                                    View Applicants
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs space-y-3" style={{ color: 'var(--text-muted)' }}>
                        <p>No active scholarship programs created yet.</p>
                        <button
                          onClick={() => { window.location.hash = '#providers/create' }}
                          className="btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>+ Create First Scholarship</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. Monthly Intake Breakdown & Desk Operations */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Monthly Submissions */}
                    <div
                      className="p-5 rounded-2xl border"
                      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                    >
                      <h3 className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-heading)' }}>
                        Submission Volume (Past 6 Months)
                      </h3>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Candidate application influx over time
                      </p>

                      {dashboard?.monthlyApplications && dashboard.monthlyApplications.length > 0 ? (
                        <div className="space-y-2.5">
                          {dashboard.monthlyApplications.map((m) => {
                            const maxVal = Math.max(...dashboard.monthlyApplications.map((x) => x.count), 1)
                            const pct = Math.round((m.count / maxVal) * 100)
                            return (
                              <div key={m.label} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                                  <span className="tabular-nums" style={{ color: 'var(--text-heading)' }}>{m.count} applicants</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200/50 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#305BFE] transition-all duration-300"
                                    style={{ width: `${Math.max(pct, m.count > 0 ? 6 : 0)}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No monthly trends available.</p>
                      )}
                    </div>

                    {/* Operational Review Actions */}
                    <div
                      className="p-5 rounded-2xl border flex flex-col justify-between"
                      style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                    >
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-heading)' }}>
                          Desk Operations & Workflows
                        </h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                          Essential verification and evaluation shortcuts
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <button
                            onClick={() => { window.location.hash = '#providers/verification' }}
                            className="p-3 rounded-xl border text-left hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                          >
                            <ShieldIcon className="w-4 h-4 text-emerald-500 mb-1" />
                            <div className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>OCR Document Checks</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Verify student credentials</div>
                          </button>

                          <button
                            onClick={() => { window.location.hash = '#providers/scheduling' }}
                            className="p-3 rounded-xl border text-left hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                          >
                            <CalendarIcon className="w-4 h-4 text-sky-500 mb-1" />
                            <div className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>Evaluation Schedules</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Interviews & examinations</div>
                          </button>

                          <button
                            onClick={() => { window.location.hash = '#providers/reports' }}
                            className="p-3 rounded-xl border text-left hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                          >
                            <ChartIcon className="w-4 h-4 text-indigo-500 mb-1" />
                            <div className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>Disbursement Ledger</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Audit & funding analytics</div>
                          </button>

                          <button
                            onClick={() => { window.location.hash = '#providers/create' }}
                            className="p-3 rounded-xl border text-left hover:border-[#305BFE] hover:bg-[var(--color-surface-panel)] transition cursor-pointer"
                            style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                          >
                            <SparklesIcon className="w-4 h-4 text-[#305BFE] mb-1" />
                            <div className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>Post New Grant</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Publish program criteria</div>
                          </button>
                        </div>
                      </div>

                      {dashboard?.funding?.remainingAllocation !== undefined && dashboard.funding.remainingAllocation > 0 && (
                        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Remaining Fund Allocation:</span>
                          <span className="font-black text-[#305BFE] tabular-nums">
                            ₱{Number(dashboard.funding.remainingAllocation).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Supporting Operational Metrics */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        title: 'Total Applications',
                        value: dashboard?.applicationsCount ?? 0,
                        subtitle: 'All Program Submissions',
                        icon: <DocumentIcon className="w-4 h-4 text-[#305BFE]" />
                      },
                      {
                        title: 'Confirmed Scholars',
                        value: dashboard?.applicationStatusCounts?.approved ?? 0,
                        subtitle: 'Awarded Scholarships',
                        icon: <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      },
                      {
                        title: 'Decision Rate',
                        value: `${dashboard?.approvalRate ?? 0}%`,
                        subtitle: 'Evaluated Submissions',
                        icon: <ChartIcon className="w-4 h-4 text-sky-500" />
                      },
                      {
                        title: 'Avg. Processing Age',
                        value: `${dashboard?.averageApplicationAgeDays ?? 0}d`,
                        subtitle: 'Days from Submission',
                        icon: <ClockIcon className="w-4 h-4 text-amber-500" />
                      },
                    ].map((m) => (
                      <div
                        key={m.title}
                        className="p-4 rounded-2xl border"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            {m.title}
                          </span>
                          {m.icon}
                        </div>
                        <div className="text-2xl font-black tracking-tight mt-2 tabular-nums" style={{ color: 'var(--text-heading)' }}>
                          {m.value}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {m.subtitle}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Page Content Component */}
          {PageComponent && (
            <div className="animate-fadeIn">
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center p-12 min-h-[350px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary, #305BFE)' }} />
                  </div>
                }
              >
                <PageComponent
                  token={token}
                  user={user}
                  onUpdate={handleUpdate}
                  dashboard={dashboard}
                  {...pageProps}
                />
              </React.Suspense>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
