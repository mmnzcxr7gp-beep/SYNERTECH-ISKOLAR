import React from 'react'

export default function FinalCTA({ onLogin }) {
  return (
    <section className="py-16 md:py-20 section-white" aria-labelledby="cta-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div
          className="card-modern p-5 sm:p-10 md:p-14 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 border-[#305BFE]/25"
          style={{
            backgroundColor: 'var(--color-bg-light-blue)',
          }}
        >
          {/* Left Column: Heading and Context */}
          <div className="max-w-xl space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#93ABFF]">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
            <a href="#scholarships" className="btn-action w-full sm:w-auto justify-center text-center">
              <span>Browse Scholarships</span>
              <span aria-hidden="true">→</span>
            </a>
            <button
              type="button"
              onClick={onLogin}
              className="btn-secondary w-full sm:w-auto justify-center text-center"
            >
              Sign In
            </button>
            <a
              href="mailto:iskolar.official@gmail.com?subject=Provider%20Onboarding%20Inquiry"
              className="btn-ghost text-xs font-bold text-center py-2 sm:py-1 w-full sm:w-auto hover:text-[#305BFE] transition"
            >
              Provider Registration
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
