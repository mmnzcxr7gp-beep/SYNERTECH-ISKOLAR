import React from 'react'

// This component previously duplicated the opportunity creation UI.
// It is now intentionally removed/disabled so providers only use:
// - ScholarshipCreatePage ("#providers/create")
// The filename is kept to avoid breaking any deep links.
export default function ScholarshipOpportunityCreatePage() {
  return (
    <div className="w-full py-6">
      <div className="w-full">
        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/95 p-8 shadow-[0_35px_90px_-40px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Deprecated</p>
              <h1 className="mt-3 text-4xl font-bold text-white">Create Opportunity removed</h1>
              <p className="mt-4 max-w-2xl text-slate-400">
                Use <span className="text-sky-300 font-semibold">Create Scholarship</span> instead.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                window.location.hash = '#providers/create'
              }}
            >
              Go to Create Scholarship
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

