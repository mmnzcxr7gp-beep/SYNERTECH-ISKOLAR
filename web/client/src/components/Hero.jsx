import React from 'react'
import { CheckIcon, BoltIcon, PhoneIcon } from './Icons'

export default function Hero({ onLogin }) {
  return (
    <section id="home" className="pt-8 pb-16 md:pt-12 md:pb-24 relative" aria-label="Introduction">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Main 2-Column Hero Grid */}
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] items-center">
          
          {/* Left Column: Heading, Context, and Actions */}
          <div className="space-y-6">
            
            {/* Context Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full px-3.5 py-1 text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="h-2 w-2 rounded-full bg-[#FF6D29]"></span>
              <span className="font-bold text-[var(--color-text-heading)]">ISKOLAR 2.0</span>
              <span className="opacity-40">•</span>
              <span>Academic Scholarship Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-heading">
              Scholarship applications made clearer.
            </h1>

            {/* Supporting Paragraph */}
            <p className="body-text text-base md:text-lg leading-relaxed max-w-xl">
              Discover opportunities, submit requirements, track application progress, and communicate securely with scholarship providers.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
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
            </div>

            {/* Small Trust Statement */}
            <div className="pt-4 border-t flex items-center gap-2 text-xs font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Assisting Filipino students with verified scholarship grants, OCR-assisted document checks, and transparent evaluation.</span>
            </div>
          </div>

          {/* Right Column: Real Interface Preview */}
          <div className="relative">
            <div
              className="modular-card p-5 sm:p-7 space-y-4"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Card Window Header */}
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                  <span className="font-mono text-xs ml-1 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    evaluation-workspace / APP-2026-09
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Active Review
                </span>
              </div>

              {/* Evaluation Step 1: OCR Extraction Review */}
              <div
                className="p-4 rounded-xl border space-y-1.5"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>OCR Document Extraction</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                    Confidence: 98.4%
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-heading)' }}>
                  Certificate of Grades & Enrollment Record
                </div>
                <div className="text-xs flex items-center justify-between font-mono pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Extracted GWA: 1.25</span>
                  <span className="text-emerald-600 font-sans font-medium">Student Confirmed</span>
                </div>
              </div>

              {/* Evaluation Step 2: Merit Criteria Assessment */}
              <div
                className="p-4 rounded-xl border space-y-1.5"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-[#FF6D29]">
                    <BoltIcon className="w-3.5 h-3.5 text-[#FF6D29]" />
                    <span>Eligibility & Criteria Check</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-[#FF6D29]">
                    Score: 94.5 / 100
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-heading)' }}>
                  Engineering & STEM Grant Guidelines
                </div>
                <div className="text-xs flex items-center justify-between pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Income & Academic Thresholds Met</span>
                  <span className="font-semibold text-[#FF6D29]">Shortlisted for Panel</span>
                </div>
              </div>

              {/* Evaluation Step 3: Notification Dispatch */}
              <div
                className="p-4 rounded-xl border space-y-1.5"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-sky-600">
                    <PhoneIcon className="w-3.5 h-3.5 text-sky-600" />
                    <span>Candidate Notification</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-700">
                    Dispatched
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-heading)' }}>
                  Interview Schedule Coordination
                </div>
                <div className="text-xs flex items-center justify-between pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Synchronized with Mobile App</span>
                  <span className="text-sky-600 font-medium">Delivered</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
