import React from 'react'

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '—'
  return `₱${value.toLocaleString()}`
}

const formatValue = (value, suffix = '') => {
  if (value === null || value === undefined) return '—'
  return `${value}${suffix}`
}

export default function ReportsPage({ dashboard }) {
  const statusCounts = dashboard?.applicationStatusCounts || {}
  const topPrograms = dashboard?.topPrograms || []
  const monthlyApplications = dashboard?.monthlyApplications || []
  const totalApplicants = dashboard?.totalApplicants ?? 0
  const approvalRate = dashboard?.approvalRate ?? null
  const averageWaitTime = dashboard?.averageApplicationAgeDays ?? null
  const funding = dashboard?.funding || {}

  const metricCards = [
    {
      title: 'Monthly applicants',
      value: monthlyApplications.length > 0 ? monthlyApplications.reduce((sum, item) => sum + (item.count || 0), 0) : totalApplicants,
      description: 'Applications received in the current reporting window',
      accent: 'from-cyan-500 to-sky-500',
    },
    {
      title: 'Scholarships awarded',
      value: statusCounts.approved ?? 0,
      description: 'Total approved applications',
      accent: 'from-violet-500 to-fuchsia-500',
    },
    {
      title: 'Average review time',
      value: averageWaitTime !== null ? `${Math.round(averageWaitTime)} days` : '—',
      description: 'Average days since students applied',
      accent: 'from-amber-500 to-orange-400',
    },
    {
      title: 'Approval rate',
      value: approvalRate !== null ? `${approvalRate}%` : '—',
      description: 'Share of applications with a decision',
      accent: 'from-emerald-500 to-emerald-400',
    },
  ]

  const trendData = [
    { label: 'Pending', value: statusCounts.pending ?? 0 },
    { label: 'Approved', value: statusCounts.approved ?? 0 },
    { label: 'Rejected', value: statusCounts.rejected ?? 0 },
    { label: 'Ranked', value: statusCounts.ranked ?? 0 },
  ]

  const maxTrendValue = Math.max(...trendData.map((item) => item.value), 1)

  return (
    <div className="w-full text-slate-100 p-6 space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
            <p className="mt-2 text-slate-400 max-w-2xl">Track applicant activity, scholarship performance, and funding results for your provider account.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-cyan-500 px-4 py-3 text-slate-950 font-semibold hover:bg-cyan-400 transition">Export CSV</button>
            <button className="rounded-xl border border-slate-700 px-4 py-3 text-slate-200 hover:border-slate-500 transition">Refresh data</button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <div key={metric.title} className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{metric.title}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-3xl bg-gradient-to-br ${metric.accent} shadow-lg`} />
              </div>
              <p className="mt-4 text-sm text-slate-400">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Application funnel</h2>
              <p className="mt-2 text-slate-400">Current applicant status breakdown and conversion performance.</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {trendData.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500" style={{ width: `${(item.value / maxTrendValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-lg">
          <div>
            <h2 className="text-xl font-semibold text-white">Top performing programs</h2>
            <p className="mt-2 text-slate-400">Scholarships with the strongest applicant and award rates.</p>
          </div>

          <div className="mt-6 space-y-4">
            {topPrograms.length > 0 ? (
              topPrograms.map((program) => (
                <div key={program.id || program.title} className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-white">{program.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{program.applicants} applicants · {program.approved} awards</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">{program.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5 text-slate-400">
                No program analytics available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Funding usage</h2>
            <p className="mt-2 text-slate-400">See current engagement across programs and award distribution.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Total funds committed</p>
            <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(funding.totalFundingAmount)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Funds disbursed</p>
            <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(funding.totalDisbursedAmount)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Remaining allocation</p>
            <p className="mt-3 text-2xl font-semibold text-white">{formatCurrency(funding.remainingAllocation)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
