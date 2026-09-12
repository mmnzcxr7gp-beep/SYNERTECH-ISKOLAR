import React from 'react'

const processSteps = [
  { id: 'discover', label: '1. Discover', href: '#scholarships', desc: 'Find open grants' },
  { id: 'requirements', label: '2. Check Requirements', href: '#eligibility', desc: 'Match criteria' },
  { id: 'apply', label: '3. Apply & Upload', href: '#how-it-works', desc: 'Submit documents' },
  { id: 'track', label: '4. Track Progress', href: '#how-it-works', desc: 'Real-time milestones' },
  { id: 'updates', label: '5. Get Updates', href: '#safety', desc: 'Verified decisions' },
]

export default function ProcessStrip() {
  return (
    <section className="py-6 px-4 md:px-8 max-w-7xl mx-auto" aria-label="Application Process Overview">
      <div
        className="modular-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4"
        style={{ backgroundColor: 'var(--color-bg-panel)' }}
      >
        <div className="flex items-center gap-2 pl-1 sm:pl-3 shrink-0">
          <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-[#305BFE]"></span>
          <span className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
            Application Pathway:
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:flex-1 justify-start sm:justify-end" aria-label="Process Steps">
          {processSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <a
                href={step.href}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition hover:bg-[var(--color-bg-elevated)]"
                style={{
                  color: 'var(--color-text-primary)',
                  border: '1px solid transparent'
                }}
              >
                <span>{step.label}</span>
              </a>
              {idx < processSteps.length - 1 && (
                <span className="hidden lg:inline text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
                  →
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </section>
  )
}
