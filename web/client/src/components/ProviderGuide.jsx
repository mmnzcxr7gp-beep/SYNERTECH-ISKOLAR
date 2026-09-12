import React from 'react'
import { motion } from 'framer-motion'
import SpotlightCard from './SpotlightCard'
import ShinyButton from './ShinyButton'
import { BuildingIcon, ChartIcon, BoltIcon, LockIcon, CalendarIcon, ArrowRightIcon } from './Icons'

export default function ProviderGuide({ onLogin }) {
  return (
    <section id="provider-info" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="mb-14 max-w-3xl space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Provider Onboarding & Integration
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Empower Your Organization to Publish & Manage Grants.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed font-normal" style={{ color: 'var(--text-secondary)' }}>
            Publish eligibility criteria, review student submissions, verify extracted documents, and coordinate awards with complete administrative transparency.
          </p>
        </div>

        {/* 2-Column Cards */}
        <div className="grid gap-8 lg:grid-cols-2">
          <SpotlightCard className="p-7 md:p-8 space-y-5">
            <h3 className="text-xl font-black" style={{ color: 'var(--text-heading)' }}>
              Provider Management Capabilities
            </h3>
            <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <BuildingIcon className="w-4 h-4 text-[#305BFE]" />
                  <p className="font-extrabold text-base" style={{ color: 'var(--text-heading)' }}>
                    Verified Organization Identity
                  </p>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Publish grants under an authenticated profile vetted by university and municipal administrators.
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <ChartIcon className="w-4 h-4 text-emerald-500" />
                  <p className="font-extrabold text-base" style={{ color: 'var(--text-heading)' }}>
                    Multi-Stage Applicant Tracking
                  </p>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Review submissions, evaluate extracted documents, and manage approval queues in one unified dashboard.
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <BoltIcon className="w-4 h-4 text-sky-500" />
                  <p className="font-extrabold text-base" style={{ color: 'var(--text-heading)' }}>
                    Automated Scoring & Criteria Filtering
                  </p>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Filter applicants automatically based on degree course, GWA thresholds, and household income parameters.
                </p>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-7 md:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <h3 className="text-xl font-black" style={{ color: 'var(--text-heading)' }}>
                Security & Partner Verification
              </h3>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <LockIcon className="w-4 h-4 text-[#305BFE]" />
                  <p className="font-extrabold text-base" style={{ color: 'var(--text-heading)' }}>
                    Encrypted Applicant Data
                  </p>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Access to applicant sensitive documents is restricted via encrypted channels and role-based access control.
                </p>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarIcon className="w-4 h-4 text-emerald-500" />
                  <p className="font-extrabold text-base" style={{ color: 'var(--text-heading)' }}>
                    Interview & Examination Coordination
                  </p>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  Schedule applicant interviews, notify candidates in real-time, and log panel assessment results.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              {onLogin && (
                <ShinyButton onClick={onLogin} size="md">
                  Provider Sign In
                </ShinyButton>
              )}
              <a
                href="mailto:iskolar.official@gmail.com?subject=Provider%20Onboarding%20Request"
                className="btn-secondary px-5 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <span>Request Credentials</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </SpotlightCard>
        </div>

      </div>
    </section>
  )
}
