import React from 'react'

export default function FinalCTA({ onLogin }) {
  return (
    <section className="py-16 md:py-20 section-white" aria-labelledby="cta-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div
          className="modular-card p-8 sm:p-12 md:p-16 flex flex-col md:flex-row md:items-center justify-between gap-8 border-[#FF6D29]/30"
          style={{
            backgroundColor: 'var(--color-bg-orange-tint)',
          }}
        >
          {/* Left Column: Heading and Context */}
          <div className="max-w-xl space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6D29]">
              Start Your Journey
            </span>
            <h2 id="cta-heading" className="section-heading text-2xl sm:text-3xl md:text-4xl">
              Ready to discover or publish scholarships?
            </h2>
            <p className="body-text text-sm sm:text-base">
              Join thousands of Filipino students and verified educational foundations on the unified ISKOLAR platform.
            </p>
          </div>

          {/* Right Column: Actions */}
          <div className="flex flex-wrap items-center gap-3.5 shrink-0">
            <a href="#scholarships" className="btn-primary">
              <span>Browse Scholarships</span>
              <span aria-hidden="true">→</span>
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="btn-secondary"
            >
              Sign In
            </button>
            <a
              href="mailto:iskolar.official@gmail.com?subject=Provider%20Onboarding%20Inquiry"
              className="btn-ghost text-xs font-bold"
            >
              Provider Registration
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
