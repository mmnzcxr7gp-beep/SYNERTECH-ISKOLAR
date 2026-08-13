import React, { useEffect, useState } from 'react'
import { useTheme } from './ThemeContext'
import IskolarLogo from './IskolarLogo'
import ApplicantsPage from './ApplicantsPage'
import ScholarshipCreatePage from './ScholarshipCreatePage'
import ScholarshipsPage from './ScholarshipsPage'
import ScholarshipEditPage from './ScholarshipEditPage'
import ReportsPage from './ReportsPage'
import SettingsPage from './SettingsPage'
import ScholarshipOpportunityCreatePage from './ScholarshipOpportunityCreatePage'
import SchedulingPage from './SchedulingPage'
import DocumentVerificationPage from './DocumentVerificationPage'
import PrivacyPolicyPage from './PrivacyPolicyPage'

const navItems = [
  { label: 'Dashboard', icon: '✦', route: 'providers' },
  { label: 'Scholarships', icon: '❖', route: 'providers/scholarships' },
  { label: 'Applicants', icon: '◈', route: 'providers/applicants' },
  { label: 'Document Review', icon: '☍', route: 'providers/verification' },
  { label: 'Scheduling', icon: '◇', route: 'providers/scheduling' },
  { label: 'Notifications', icon: '🔔', route: 'providers/notifications' },
  { label: 'Reports', icon: '◈', route: 'providers/reports' },
  { label: 'Organization Profile', icon: '🏢', route: 'providers/profile' },
  { label: 'Settings', icon: '⚙', route: 'providers/settings' },
]

const routeMap = {
  providers: null,
  'providers/scholarships': ScholarshipsPage,
  'providers/applicants': ApplicantsPage,
  'providers/scheduling': SchedulingPage,
  'providers/verification': DocumentVerificationPage,
  'providers/notifications': ReportsPage,
  'providers/reports': ReportsPage,
  'providers/profile': SettingsPage,
  'providers/settings': SettingsPage,
  'providers/privacy': PrivacyPolicyPage,
  'providers/create': ScholarshipCreatePage,
  'providers/edit': ScholarshipEditPage,
  'providers/create-opportunity': ScholarshipOpportunityCreatePage,
}


export default function ProviderDashboard({ onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const baseUrl = isLocal ? 'http://localhost:4000' : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:4000')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return 'providers'
    return window.location.hash.replace('#', '') || 'providers'
  })
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('provider_token') || localStorage.getItem('auth_token') || localStorage.getItem('admin_token')
  })

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.replace('#', '') || 'providers')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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

      // Load profile
      try {
        console.log('[ProviderDashboard] Fetching /api/auth/me with token:', token.substring(0, 20) + '...')
        const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('[ProviderDashboard] Profile response status:', profileRes.status)

        if (!profileRes.ok) {
          const errBody = await profileRes.text().catch(() => 'No response body')
          console.error('[ProviderDashboard] Profile error response:', errBody)
          if (profileRes.status === 401) {
            logout()
            return
          }
          throw new Error(`Profile request failed: ${profileRes.status} ${profileRes.statusText}`)
        }

        const profileBody = await profileRes.json()
        console.log('[ProviderDashboard] Profile loaded successfully')
        setUser(profileBody.user || null)
      } catch (err) {
        console.error('[ProviderDashboard] Profile error:', err)
        setError(err.message || 'Unable to load profile')
      }

      // Load dashboard
      try {
        console.log('[ProviderDashboard] Fetching /api/providers/dashboard with token:', token.substring(0, 20) + '...')
        const dashboardRes = await fetch(`${baseUrl}/api/providers/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('[ProviderDashboard] Dashboard response status:', dashboardRes.status)

        if (!dashboardRes.ok) {
          const errBody = await dashboardRes.text().catch(() => 'No response body')
          console.error('[ProviderDashboard] Dashboard error response:', errBody)
          if (dashboardRes.status === 401) {
            logout()
            return
          }
          throw new Error(`Dashboard request failed: ${dashboardRes.status} ${dashboardRes.statusText}`)
        }

        const dashboardBody = await dashboardRes.json()
        console.log('[ProviderDashboard] Dashboard loaded successfully')
        setDashboard(dashboardBody.dashboard || null)
      } catch (err) {
        console.error('[ProviderDashboard] Dashboard error:', err)
        setDashboardError(err.message || 'Unable to load dashboard data')
      } finally {
        setLoading(false)
        setDashboardLoading(false)
      }
    }

    // initial load
    loadProfileAndDashboard()

    // refresh dashboard periodically (so analytics like new applications/approvals update)
    intervalId = window.setInterval(() => {
      if (!token) return
      // refresh only dashboard; keep UI responsive
      fetch('/api/providers/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    localStorage.removeItem('auth_user')
    setToken(null)
    setUser(null)
    if (onLogout) onLogout()
    window.location.hash = '#home'
  }

  const handleUpdate = async () => {
    if (!token) return

    try {
      const profileRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (profileRes.ok) {
        const profileBody = await profileRes.json()
        setUser(profileBody.user || null)
      }
    } catch (err) {
      console.error('Failed to reload profile:', err)
    }

    try {
      const dashboardRes = await fetch('/api/providers/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (dashboardRes.ok) {
        const dashboardBody = await dashboardRes.json()
        setDashboard(dashboardBody.dashboard || null)
      }
    } catch (err) {
      console.error('Failed to reload dashboard:', err)
    }
  }

  let activeRoute = routeMap[route] ? route : 'providers'
  let pageProps = {}
  const editMatch = route.match(/^providers\/edit\/(.+)$/)
  if (!routeMap[route] && editMatch) {
    activeRoute = 'providers/edit'
    pageProps = {
      token,
      user,
      scholarshipId: editMatch[1],
      onUpdated: handleUpdate,
    }
  }

  let PageComponent = routeMap[activeRoute]

  // Dynamic opportunities review routes removed (now handled via scholarships flow)



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div>Loading provider dashboard…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-rose-300">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <aside className="fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-50 overflow-y-auto transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <IskolarLogo size="md" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = activeRoute === item.route
            return (
              <button
                key={item.route}
                onClick={() => { window.location.hash = `#${item.route}` }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/10 text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200 text-xs font-semibold"
          >
            <span>Appearance</span>
            <span className="flex items-center gap-1.5 font-medium">
              {theme === 'dark' ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Dark</span>
                </>
              )}
            </span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-all duration-200 font-semibold"
          >
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="px-6 py-6 w-full">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Provider Dashboard</h1>
              <p className="mt-2 text-slate-400">
                {user?.organization_name
                  ? `Welcome back, ${user.name} from ${user.organization_name}`
                  : `Welcome back, ${user?.name || 'Provider'}`}
              </p>
            </div>

            {/* Primary action */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { window.location.hash = '#providers/create' }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold hover:from-cyan-400 hover:to-sky-400 transition shadow-sm"
              >
                + Create Scholarship
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mt-6 grid gap-6">
            {/* Only show Overview when on dashboard route */}
            {activeRoute === 'providers' ? (
              <section className="rounded-3xl border border-slate-800/60 bg-slate-900/40 p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Overview</h2>
                    <p className="text-slate-400">Your performance at a glance</p>
                  </div>
                  <div className="text-xs text-slate-500 border border-slate-800/60 rounded-xl px-3 py-2 bg-slate-950/30">
                    Updated just now
                  </div>
                </div>

                {/* Horizontal stats row: 4 cards */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboardLoading ? (
                    <div className="col-span-full rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6 text-center text-slate-400">
                      Loading your analytics…
                    </div>
                  ) : (
                    [
                      {
                        title: 'Total Scholarships',
                        value: dashboard ? dashboard.totalScholarships : '—',
                        accent: 'from-cyan-500 to-sky-500',
                      },
                      {
                        title: 'Active Scholarships',
                        value: dashboard ? dashboard.openScholarshipsCount ?? '—' : '—',
                        accent: 'from-emerald-500 to-emerald-400',
                      },
                      {
                        title: 'Total Applicants',
                        value: dashboard?.applicationsCount ?? '—',
                        accent: 'from-violet-500 to-fuchsia-500',
                      },
                      {
                        title: 'Pending Reviews',
                        value: dashboard?.applicationStatusCounts?.pending ?? '—',
                        accent: 'from-orange-500 to-amber-500',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{item.title}</p>
                            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                          </div>
                          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${item.accent} shadow-sm`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {dashboardError ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
                    {dashboardError}
                  </div>
                ) : null}

                {/* Quick actions */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => { window.location.hash = '#providers/create' }}
                    className="px-4 py-3 rounded-2xl bg-slate-800/60 text-slate-100 hover:bg-slate-800 border border-slate-700/60 transition text-sm font-medium"
                  >
                    + Create Scholarship
                  </button>
                  <button
                    onClick={() => { window.location.hash = '#providers/applicants' }}
                    className="px-4 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 transition text-sm font-medium"
                  >
                    Review Applicants
                  </button>
                  <button
                    onClick={() => { window.location.hash = '#providers/reports' }}
                    className="px-4 py-3 rounded-2xl bg-slate-800/60 text-slate-100 hover:bg-slate-800 border border-slate-700/60 transition text-sm font-medium"
                  >
                    View Reports
                  </button>
                  <button
                    onClick={() => { window.location.hash = '#providers/scholarships' }}
                    className="px-4 py-3 rounded-2xl bg-slate-800/60 text-slate-100 hover:bg-slate-800 border border-slate-700/60 transition text-sm font-medium"
                  >
                    View Scholarships
                  </button>
                </div>

                {/* Analytics summary (extra content) */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/30 p-4">
                    <p className="text-sm font-semibold text-white">This week</p>
                    <p className="mt-1 text-xs text-slate-400">
                      New applications: <span className="text-cyan-200 font-medium">{dashboard?.weeklyApplicationsCount ?? 0}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      New approvals: <span className="text-emerald-200 font-medium">{dashboard?.weeklyApprovalsCount ?? 0}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800/60 bg-slate-950/30 p-4">
                    <p className="text-sm font-semibold text-white">Upcoming deadlines</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {dashboard?.upcomingDeadlinesSummary ?? 'Check scholarships for deadlines.'}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Page content */}
            <section className="rounded-3xl border border-slate-800/60 bg-slate-900/40 p-4 lg:p-6 shadow-sm">
              {PageComponent ? (
                <PageComponent
                  token={token}
                  user={user}
                  onUpdate={handleUpdate}
                  dashboard={dashboard}
                  {...pageProps}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
