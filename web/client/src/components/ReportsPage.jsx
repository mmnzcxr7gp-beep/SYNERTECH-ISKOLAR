import React, { useEffect, useState } from 'react'
import { apiClient } from '../services/api'
import { ChartIcon, DownloadIcon } from './Icons'

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '—'
  return `₱${value.toLocaleString()}`
}

export default function ReportsPage({ dashboard: propDashboard, token, user }) {
  const [dashboard, setDashboard] = useState(propDashboard || null)
  const [loading, setLoading] = useState(!propDashboard)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (propDashboard) {
      setDashboard(propDashboard)
      return
    }

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [appsData, schData, txData] = await Promise.all([
          apiClient.get('/api/applications', { token }).catch(() => ({ applications: [] })),
          apiClient.get('/api/scholarships', { token }).catch(() => ({ scholarships: [] })),
          apiClient.get('/api/transactions/provider/statistics', { token }).catch(() => null),
        ])

        const apps = Array.isArray(appsData) ? appsData : appsData?.applications || appsData?.data || []
        const schs = Array.isArray(schData) ? schData : schData?.scholarships || schData?.data || []

        const pending = apps.filter((a) => String(a.status || '').toLowerCase() === 'pending').length
        const approved = apps.filter((a) => String(a.status || '').toLowerCase() === 'approved').length
        const rejected = apps.filter((a) => String(a.status || '').toLowerCase() === 'rejected').length
        const underReview = apps.filter((a) => {
          const s = String(a.status || '').toLowerCase()
          return s.includes('review') || s.includes('ranked') || s.includes('shortlisted')
        }).length

        const decided = approved + rejected
        const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0

        // Real Average Review Duration from application timestamps
        let totalReviewDays = 0
        let reviewCount = 0
        apps.forEach((a) => {
          if (a.createdAt && (a.status === 'approved' || a.status === 'rejected') && a.updatedAt) {
            const created = new Date(a.createdAt).getTime()
            const updated = new Date(a.updatedAt).getTime()
            if (updated > created) {
              totalReviewDays += (updated - created) / (1000 * 60 * 60 * 24)
              reviewCount++
            }
          }
        })
        const averageWaitTime = reviewCount > 0 ? (totalReviewDays / reviewCount).toFixed(1) : null

        // Program breakdowns
        const topPrograms = schs.slice(0, 5).map((s) => {
          const sId = String(s.id || s._id)
          const sApps = apps.filter((a) => String(a.scholarship_id || a.scholarshipId) === sId)
          const sApproved = sApps.filter((a) => String(a.status || '').toLowerCase() === 'approved').length
          return {
            id: sId,
            title: s.title || 'Untitled Program',
            applicants: sApps.length,
            approved: sApproved,
            status: s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Open',
          }
        })

        // Real Funding Allocation calculation from actual scholarship entries
        let totalFunding = 0
        let hasSpecifiedFunding = false
        schs.forEach((s) => {
          const amount = Number(s.maxAmount || s.allowance)
          const slots = Number(s.totalSlots || s.slots)
          if (!isNaN(amount) && amount > 0) {
            hasSpecifiedFunding = true
            totalFunding += amount * (slots > 0 ? slots : 1)
          }
        })

        // Real Disbursed amount from verified transactions or allowance ledger
        const realDisbursed = txData?.totalAmount ?? 0

        setDashboard({
          applicationStatusCounts: {
            pending,
            approved,
            rejected,
            ranked: underReview,
          },
          totalApplicants: apps.length,
          approvalRate,
          averageWaitTime,
          topPrograms,
          funding: {
            hasSpecifiedFunding,
            totalFundingAmount: hasSpecifiedFunding ? totalFunding : null,
            totalDisbursedAmount: realDisbursed,
            remainingAllocation: hasSpecifiedFunding ? Math.max(0, totalFunding - realDisbursed) : null,
          },
        })
      } catch (err) {
        console.error('[ReportsPage] Error loading report metrics:', err)
        setError('Unable to load full report metrics from backend services.')
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
  const averageWaitTime = dashboard?.averageWaitTime
  const funding = dashboard?.funding || {}

  const metricCards = [
    {
      title: 'Total Applicants',
      value: totalApplicants,
      description: 'Candidate submissions across programs',
    },
    {
      title: 'Approved Grants',
      value: statusCounts.approved ?? 0,
      description: 'Officially awarded applications',
    },
    {
      title: 'Avg. Review Time',
      value: averageWaitTime ? `${averageWaitTime} days` : 'No decided records',
      description: 'Time from submission to provider decision',
    },
    {
      title: 'Approval Rate',
      value: `${approvalRate}%`,
      description: 'Percentage of finalized applications awarded',
    },
  ]

  const trendData = [
    { label: 'Pending Initial Review', value: statusCounts.pending ?? 0, color: '#F59E0B' },
    { label: 'Under Review / Shortlisted', value: statusCounts.ranked ?? 0, color: '#38BDF8' },
    { label: 'Approved Grants', value: statusCounts.approved ?? 0, color: '#10B981' },
    { label: 'Rejected', value: statusCounts.rejected ?? 0, color: '#EF4444' },
  ]

  const maxTrendValue = Math.max(...trendData.map((item) => item.value), 1)

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Applicants', totalApplicants],
      ['Approved Grants', statusCounts.approved ?? 0],
      ['Pending Initial Review', statusCounts.pending ?? 0],
      ['Under Review / Shortlisted', statusCounts.ranked ?? 0],
      ['Rejected', statusCounts.rejected ?? 0],
      ['Approval Rate', `${approvalRate}%`],
      ['Avg. Review Time (Days)', averageWaitTime ?? 'N/A'],
      ['Total Funding Committed', funding.totalFundingAmount ?? 'Not Specified'],
      ['Total Funds Disbursed', funding.totalDisbursedAmount ?? 0],
      ['Remaining Allocation', funding.remainingAllocation ?? 'Not Specified'],
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
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
        <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="h-6 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-4 w-96 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(48, 91, 254, 0.10)',
              color: '#305BFE',
              borderColor: 'rgba(48, 91, 254, 0.25)'
            }}
          >
            Analytics & Auditing
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
            Program Metrics & Reports
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>
            Real-time candidate pipelines, grant allocation summaries, and program metrics directly from active database records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer no-print"
          >
            <ChartIcon className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-action px-4 py-2 text-xs font-bold shadow-md cursor-pointer no-print flex items-center gap-1.5"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
          {error}
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div
            key={metric.title}
            className="rounded-2xl border p-5 transition hover:shadow-md"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)'
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {metric.title}
            </p>
            <p className="mt-2 text-3xl font-black" style={{ color: 'var(--primary)' }}>
              {metric.value}
            </p>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline Status Breakdown and Program Performance */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section
          className="rounded-2xl border p-6 sm:p-7 shadow-sm"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
              Applicant Pipeline Funnel
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Distribution of candidates across current workflow milestones.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {trendData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>{item.label}</span>
                  <span className="font-bold" style={{ color: 'var(--color-text-heading)' }}>
                    {item.value}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
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
          className="rounded-2xl border p-6 sm:p-7 shadow-sm"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
              Active Program Performance
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Programs with candidate engagement and awarded allocations.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {topPrograms.length > 0 ? (
              topPrograms.map((program) => (
                <div
                  key={program.id || program.title}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: 'var(--color-bg-panel)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-heading)' }}>
                        {program.title}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {program.applicants} applicants · {program.approved} awarded
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold border flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {program.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div
                className="rounded-xl border p-6 text-center text-xs"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}
              >
                No active program performance records found in database.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Real Funding Allocation Overview */}
      <section
        className="rounded-2xl border p-6 sm:p-7 shadow-sm"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
            Grant Funding & Disbursement Ledger
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Financial statistics calculated strictly from defined program allocations and verified transactions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Total Funding Committed
            </p>
            <p className="mt-2 text-2xl font-black" style={{ color: 'var(--color-text-heading)' }}>
              {funding.hasSpecifiedFunding ? formatCurrency(funding.totalFundingAmount) : 'Not Specified'}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              {funding.hasSpecifiedFunding ? 'Calculated from program quotas' : 'No fixed grant budgets specified'}
            </p>
          </div>

          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Verified Funds Disbursed
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-500">
              {formatCurrency(funding.totalDisbursedAmount)}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              From approved transaction records
            </p>
          </div>

          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Remaining Allocation
            </p>
            <p className="mt-2 text-2xl font-black" style={{ color: 'var(--primary)' }}>
              {funding.hasSpecifiedFunding ? formatCurrency(funding.remainingAllocation) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Committed grant funds remaining
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
