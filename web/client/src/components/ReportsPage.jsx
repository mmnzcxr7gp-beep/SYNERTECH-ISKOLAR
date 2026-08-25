import React, { useEffect, useState } from 'react'

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '—'
  return `₱${value.toLocaleString()}`
}

export default function ReportsPage({ dashboard: propDashboard, token, user }) {
  const [dashboard, setDashboard] = useState(propDashboard || null)
  const [loading, setLoading] = useState(!propDashboard)

  useEffect(() => {
    if (propDashboard) {
      setDashboard(propDashboard)
      return
    }

    async function loadData() {
      setLoading(true)
      try {
        const [appsRes, schRes] = await Promise.all([
          fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/scholarships', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const appsData = appsRes.ok ? await appsRes.json() : { applications: [] }
        const schData = schRes.ok ? await schRes.json() : { scholarships: [] }

        const apps = appsData.applications || []
        const schs = schData.scholarships || []

        const pending = apps.filter((a) => String(a.status || '').toLowerCase() === 'pending').length
        const approved = apps.filter((a) => String(a.status || '').toLowerCase() === 'approved').length
        const rejected = apps.filter((a) => String(a.status || '').toLowerCase() === 'rejected').length
        const underReview = apps.filter((a) => String(a.status || '').toLowerCase().includes('review')).length

        const decided = approved + rejected
        const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0

        const topPrograms = schs.slice(0, 5).map((s) => {
          const sApps = apps.filter((a) => String(a.scholarship_id || a.scholarshipId) === String(s.id || s._id))
          const sApproved = sApps.filter((a) => String(a.status || '').toLowerCase() === 'approved').length
          return {
            id: s.id || s._id,
            title: s.title,
            applicants: sApps.length,
            approved: sApproved,
            status: s.status || 'Open',
          }
        })

        const totalFunding = schs.reduce((acc, s) => acc + (s.maxAmount || 50000) * (s.totalSlots || s.slots || 10), 0)
        const disbursed = approved * 35000

        setDashboard({
          applicationStatusCounts: {
            pending,
            approved,
            rejected,
            ranked: underReview,
          },
          totalApplicants: apps.length,
          approvalRate,
          averageApplicationAgeDays: 4.5,
          topPrograms,
          funding: {
            totalFundingAmount: totalFunding,
            totalDisbursedAmount: disbursed,
            remainingAllocation: Math.max(0, totalFunding - disbursed),
          },
        })
      } catch (err) {
        console.error('Error fetching reports data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [propDashboard, token])

  const statusCounts = dashboard?.applicationStatusCounts || {}
  const topPrograms = dashboard?.topPrograms || []
  const totalApplicants = dashboard?.totalApplicants ?? 0
  const approvalRate = dashboard?.approvalRate ?? 0
  const averageWaitTime = dashboard?.averageApplicationAgeDays ?? 0
  const funding = dashboard?.funding || {}

  const metricCards = [
    {
      title: 'Total Applicants',
      value: totalApplicants,
      description: 'Active scholarship candidate volume',
    },
    {
      title: 'Approved Grants',
      value: statusCounts.approved ?? 0,
      description: 'Total awarded applications',
    },
    {
      title: 'Avg. Review Time',
      value: `${Math.round(averageWaitTime)} days`,
      description: 'Average processing duration',
    },
    {
      title: 'Approval Rate',
      value: `${approvalRate}%`,
      description: 'Share of decided applications',
    },
  ]

  const trendData = [
    { label: 'Pending Review', value: statusCounts.pending ?? 0, color: '#F59E0B' },
    { label: 'Approved Grants', value: statusCounts.approved ?? 0, color: '#10B981' },
    { label: 'Rejected', value: statusCounts.rejected ?? 0, color: '#EF4444' },
    { label: 'Under Review / Ranked', value: statusCounts.ranked ?? 0, color: '#38BDF8' },
  ]

  const maxTrendValue = Math.max(...trendData.map((item) => item.value), 1)

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Applicants', totalApplicants],
      ['Approved Grants', statusCounts.approved ?? 0],
      ['Pending Review', statusCounts.pending ?? 0],
      ['Rejected', statusCounts.rejected ?? 0],
      ['Under Review', statusCounts.ranked ?? 0],
      ['Approval Rate', `${approvalRate}%`],
      ['Total Funding Committed', funding.totalFundingAmount || 0],
      ['Total Funds Disbursed', funding.totalDisbursedAmount || 0],
      ['Remaining Allocation', funding.remainingAllocation || 0],
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `iskolar_reports_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="w-full space-y-6" aria-busy="true" aria-label="Loading reports">
        <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton h-8 w-64 rounded-xl" />
          <div className="skeleton h-4 w-96 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="skeleton h-64 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Analytics Suite
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Reports & Program Metrics
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Track applicant volume, conversion rates, and funding distributions across the platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer no-print"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer no-print"
          >
            Export CSV
          </button>
        </div>
      </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <div
              key={metric.title}
              className="rounded-2xl border p-5 transition hover:shadow-md"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border)'
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {metric.title}
              </p>
              <p className="mt-2 text-3xl font-black" style={{ color: 'var(--primary)' }}>
                {metric.value}
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {metric.description}
              </p>
            </div>
          ))}
        </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section
          className="rounded-3xl border p-6 sm:p-7 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Application Status Funnel</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Applicant distribution across evaluation milestones.</p>
          </div>

          <div className="mt-6 space-y-4">
            {trendData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  <span>{item.label}</span>
                  <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{item.value}</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full" style={{ backgroundColor: 'var(--bg-input)' }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.value / maxTrendValue) * 100}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-3xl border p-6 sm:p-7 shadow-lg"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)'
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Top Performing Programs</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Programs with highest student intake.</p>
          </div>

          <div className="mt-6 space-y-3">
            {topPrograms.length > 0 ? (
              topPrograms.map((program) => (
                <div
                  key={program.id || program.title}
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>{program.title}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{program.applicants} applicants · {program.approved} awards</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold border flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {program.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border p-5 text-center text-xs" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                No program performance records available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section
        className="rounded-3xl border p-6 sm:p-7 shadow-lg"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Funding Utilization</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Financial assistance allocation and disbursement summary.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Funds Committed</p>
            <p className="mt-2 text-2xl font-black" style={{ color: 'var(--text-heading)' }}>{formatCurrency(funding.totalFundingAmount)}</p>
          </div>
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Funds Disbursed</p>
            <p className="mt-2 text-2xl font-black text-emerald-500">{formatCurrency(funding.totalDisbursedAmount)}</p>
          </div>
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Remaining Allocation</p>
            <p className="mt-2 text-2xl font-black" style={{ color: 'var(--primary)' }}>{formatCurrency(funding.remainingAllocation)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
