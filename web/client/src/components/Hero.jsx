import React, { lazy, Suspense, useState, useEffect } from 'react'
import { useTheme } from './ThemeContext'
import { SearchIcon, BuildingIcon, FilterIcon, ArrowRightIcon, PhoneIcon, CheckCircleIcon } from './Icons'
import ParticleText from './effects/ParticleText'
import EffectErrorBoundary from './effects/EffectErrorBoundary'

const Dither = lazy(() => import('./effects/Dither'))

export default function Hero({ onLogin }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [mountDither, setMountDither] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('ALL')

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => setMountDither(true), { timeout: 1200 })
      return () => window.cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(() => setMountDither(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleHeroSearch = (e) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (selectedType !== 'ALL') params.set('type', selectedType)
    const queryString = params.toString()
    window.location.hash = queryString ? `#scholarships?${queryString}` : '#scholarships'
  }

  const handleQuickTag = (tag) => {
    window.location.hash = `#scholarships?q=${encodeURIComponent(tag)}`
  }

  return (
    <section
      id="home"
      className="home-hero pt-8 pb-16 md:pt-12 md:pb-20 relative overflow-hidden"
      aria-labelledby="home-hero-title"
    >
      {/* Decorative Dither Background (Subtle ambient effect, aria-hidden, pointer-events: none) */}
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
        
        {/* Main 2-Column Hero Grid: Editorial Left, Search Desk Right */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          
          {/* Left Column: Context, Heading, Explanation, and Navigation */}
          <div className="space-y-6">
            
            {/* Context Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
              <span className="font-bold text-[var(--color-text-heading)]">ISKOLAR</span>
              <span className="opacity-40">•</span>
              <span>Academic Scholarship Desk</span>
            </div>

            {/* Semantic, Solid Accessible Heading (No Gradient Text) */}
            <h1 id="home-hero-title" className="home-hero__semantic-title text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--color-text-heading)] leading-[1.14]">
              Scholarship Applications <span className="text-[#305BFE] dark:text-[#4F96FF]">Made Clearer</span>
            </h1>

            {/* Visual Interactive Particle Accent */}
            <div className="home-hero__particle-title" aria-hidden="true">
              <EffectErrorBoundary
                fallback={
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">
                    CENTRALIZED • VERIFIED • TRANSPARENT
                  </div>
                }
              >
                <ParticleText
                  text="✦ Centralized • Verified • Transparent ✦"
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
                  fontFamily="Inter, sans-serif"
                  glow={false}
                />
              </EffectErrorBoundary>
            </div>

            {/* Editorial Concise Platform Explanation */}
            <p className="body-text text-base md:text-lg leading-relaxed max-w-xl">
              ISKOLAR connects Filipino college students with verified scholarship providers through transparent applications, document-assisted verification, and structured evaluation.
            </p>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href="#scholarships" className="btn-action text-center justify-center flex items-center gap-2">
                <span>Browse Scholarships</span>
                <span aria-hidden="true">→</span>
              </a>
              <a href="#provider-info" className="btn-secondary text-center justify-center">
                <span>Provider Portal</span>
              </a>
            </div>

            {/* Clearly Separated Student Mobile Guidance */}
            <div
              className="p-4 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-heading)]">
                <PhoneIcon className="w-4 h-4 text-[#305BFE] shrink-0" />
                <span>Student Mobile App Access</span>
              </div>
              <p className="body-text text-xs leading-relaxed">
                College students discover grants, upload official records, and track evaluations exclusively through the <strong>ISKOLAR Mobile App</strong>. The web portal serves scholarship providers and platform administrators.
              </p>
              <div className="pt-1">
                <a
                  href="#download"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#305BFE] hover:underline"
                >
                  <span>Download Student Mobile App (Android APK)</span>
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            {/* Trust Statement */}
            <div className="pt-4 border-t flex items-center gap-2 text-xs font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Assisting Filipino students with verified grants, OCR document verification, and transparent decision-making.</span>
            </div>

          </div>

          {/* Right Column: Functional "Find an Opportunity" Search Desk */}
          <div className="w-full">
            <div
              className="card-modern p-6 sm:p-7 border shadow-sm space-y-5"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="border-b pb-4 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#305BFE]">
                    Opportunity Desk
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-[#305BFE]">
                    Live Directory
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-heading)]">
                  Find a Scholarship
                </h2>
                <p className="body-text text-xs">
                  Filter verified academic grants, financial aid, and STEM fellowships.
                </p>
              </div>

              <form onSubmit={handleHeroSearch} className="space-y-4">
                {/* Keyword Search Input */}
                <div className="space-y-1.5">
                  <label htmlFor="hero-search-query" className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                    Keyword, degree, or sponsor
                  </label>
                  <div className="relative">
                    <input
                      id="hero-search-query"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. STEM, DOST, Engineering, Computer Science"
                      className="input-field text-sm w-full"
                      style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    />
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
                  </div>
                </div>

                {/* Scholarship Type Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="hero-type-filter" className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                    Program Classification
                  </label>
                  <select
                    id="hero-type-filter"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="input-field text-sm w-full"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="merit">Academic & Merit Grants</option>
                    <option value="financial_need">Financial Need Assistance</option>
                    <option value="stem">STEM & Technology Focus</option>
                  </select>
                </div>

                {/* Search Action */}
                <button
                  type="submit"
                  className="btn-action w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <SearchIcon className="w-4 h-4" />
                  <span>Search Scholarship Directory</span>
                </button>
              </form>

              {/* Quick Topic Chips */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)] block">
                  Quick searches:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Undergraduate', 'DOST', 'STEM', 'Engineering', 'Financial Need'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleQuickTag(tag)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border transition hover:border-[#305BFE] hover:text-[#305BFE]"
                      style={{
                        backgroundColor: 'var(--color-bg-panel)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verified Desk Footnote */}
              <div className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/15 text-[11px] text-[var(--color-text-muted)] flex items-start gap-2">
                <CheckCircleIcon className="w-3.5 h-3.5 text-[#305BFE] shrink-0 mt-0.5" />
                <span>All listed programs are published and evaluated by accredited partner organizations.</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
