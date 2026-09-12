import React, { lazy, Suspense, useState, useEffect } from 'react'
import { useTheme } from './ThemeContext'
import { CheckIcon, BoltIcon, PhoneIcon } from './Icons'
import ParticleText from './effects/ParticleText'
import EffectErrorBoundary from './effects/EffectErrorBoundary'

const Dither = lazy(() => import('./effects/Dither'))

export default function Hero({ onLogin }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [mountDither, setMountDither] = useState(false)

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => setMountDither(true), { timeout: 1200 })
      return () => window.cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(() => setMountDither(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <section
      id="home"
      className="home-hero pt-8 pb-16 md:pt-12 md:pb-24 relative overflow-hidden"
      aria-labelledby="home-hero-title"
    >
      {/* Decorative Dither Background (Zero Keyboard/Pointer Interference) */}
      <div className="home-hero__effect" aria-hidden="true">
        <EffectErrorBoundary fallback={<div className="dither-fallback" />}>
          {mountDither ? (
            <Suspense fallback={<div className="dither-fallback" />}>
              <Dither
                waveColor={isDark ? [0.31, 0.59, 1.0] : [0.19, 0.36, 0.99]}
                disableAnimation={false}
                enableMouseInteraction={false}
                mouseRadius={0.2}
                colorNum={4}
                pixelSize={3}
                waveAmplitude={0.18}
                waveFrequency={2.2}
                waveSpeed={0.022}
              />
            </Suspense>
          ) : (
            <div className="dither-fallback" />
          )}
        </EffectErrorBoundary>
      </div>

      <div className="home-hero__content max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
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
              <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
              <span className="font-bold text-[var(--color-text-heading)]">ISKOLAR 2.0</span>
              <span className="opacity-40">•</span>
              <span>Academic Scholarship Platform</span>
            </div>

            {/* Visible & Accessible Heading for Users, Screen Readers & SEO */}
            <h1 id="home-hero-title" className="home-hero__semantic-title text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--color-text-heading)] leading-[1.12] break-words">
              Scholarship Applications{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F96FF] via-[#305BFE] to-[#305DE0]">
                Made Clearer
              </span>
            </h1>

            {/* Visual Interactive Particle Accent */}
            <div className="home-hero__particle-title" aria-hidden="true">
              <EffectErrorBoundary
                fallback={
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">
                    CENTRALIZED • VERIFIED • REAL-TIME
                  </div>
                }
              >
                <ParticleText
                  text="✦ Centralized • Verified • Real-Time ✦"
                  particleSize={1.4}
                  density={2}
                  color={isDark ? '#94A3B8' : '#64748B'}
                  highlightColor={isDark ? '#4F96FF' : '#305BFE'}
                  scatter={15}
                  gatherDuration={800}
                  stagger={100}
                  pointerRepel={15}
                  repelRadius={60}
                  idleDrift={0.15}
                  trigger="mount"
                  fontSize="clamp(0.875rem, 1.8vw, 1.05rem)"
                  fontWeight={700}
                  fontFamily="Poppins, Inter, sans-serif"
                  glow={false}
                />
              </EffectErrorBoundary>
            </div>

            {/* Supporting Paragraph */}
            <p className="body-text text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
              Discover opportunities, submit requirements, track application progress, and communicate securely with scholarship providers.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 pt-2 w-full xs:w-auto">
              <a href="#scholarships" className="btn-action w-full xs:w-auto text-center justify-center">
                <span>Browse Scholarships</span>
                <span aria-hidden="true">→</span>
              </a>
              <button
                type="button"
                onClick={onLogin}
                className="btn-secondary w-full xs:w-auto text-center justify-center"
              >
                Sign In
              </button>
            </div>

            {/* Small Trust Statement */}
            <div className="pt-4 border-t flex items-center gap-2 text-xs font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Assisting Filipino students with verified scholarship grants, OCR-assisted document checks, and transparent evaluation.</span>
            </div>
          </div>

          {/* Right Column: Real Interface Preview */}
          <div className="relative w-full min-w-0 overflow-hidden">
            <div
              className="card-modern p-4 sm:p-7 space-y-3.5 sm:space-y-4 w-full min-w-0"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Card Window Header */}
              <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b gap-2 overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0"></div>
                  <span className="font-mono text-[11px] sm:text-xs ml-1 font-semibold truncate" style={{ color: 'var(--color-text-muted)' }}>
                    evaluation-workspace / APP-2026-09
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                  Active Review
                </span>
              </div>

              {/* Evaluation Step 1: OCR Extraction Review */}
              <div
                className="p-3 sm:p-4 rounded-xl border space-y-1.5 min-w-0"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 min-w-0">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                    <span className="truncate">OCR Document Extraction</span>
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 shrink-0">
                    Confidence: 98.4%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--color-text-heading)' }}>
                  Certificate of Grades & Enrollment Record
                </div>
                <div className="text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 font-mono pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Extracted GWA: 1.25</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-sans font-medium">Student Confirmed</span>
                </div>
              </div>

              {/* Evaluation Step 2: Merit Criteria Assessment */}
              <div
                className="p-3 sm:p-4 rounded-xl border space-y-1.5 min-w-0"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-[#93ABFF] min-w-0">
                    <BoltIcon className="w-3.5 h-3.5 text-[#93ABFF] shrink-0" />
                    <span className="truncate">Eligibility & Criteria Check</span>
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-[#93ABFF] shrink-0">
                    Score: 94.5 / 100
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--color-text-heading)' }}>
                  Engineering & STEM Grant Guidelines
                </div>
                <div className="text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Income & Academic Thresholds Met</span>
                  <span className="font-semibold text-[#93ABFF]">Shortlisted for Panel</span>
                </div>
              </div>

              {/* Evaluation Step 3: Notification Dispatch */}
              <div
                className="p-3 sm:p-4 rounded-xl border space-y-1.5 min-w-0"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-sky-400 min-w-0">
                    <PhoneIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">Candidate Notification</span>
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 shrink-0">
                    Dispatched
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--color-text-heading)' }}>
                  Interview Schedule Coordination
                </div>
                <div className="text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 pt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Synchronized with Mobile App</span>
                  <span className="text-sky-400 font-medium">Delivered</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
