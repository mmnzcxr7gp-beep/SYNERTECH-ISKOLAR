import React, { useEffect, useState, Suspense, lazy } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ThemeProvider } from './components/ThemeContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProcessStrip from './components/ProcessStrip'
import ScholarshipPreview from './components/ScholarshipPreview'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import About from './components/About'
import Download from './components/Download'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import PageWrapper from './components/PageWrapper'

const LoginModal = lazy(() => import('./components/LoginModal'))
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard'))
const ProviderGuide = lazy(() => import('./components/ProviderGuide'))
const StudentRedirectNotice = lazy(() => import('./components/StudentRedirectNotice'))
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'))
const TermsPage = lazy(() => import('./components/TermsPage'))
const AccessibilityPage = lazy(() => import('./components/AccessibilityPage'))
const HelpFaqPage = lazy(() => import('./components/HelpFaqPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12 min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" style={{ borderColor: 'var(--color-accent-blue, #2563eb)' }} />
  </div>
)

/**
 * Robust Route Resolver: Inspects both hash (#) and pathname (/)
 * Supports clean pathnames (/terms, /scholarships) and hash shortcuts (#help, #accessibility)
 */
function resolveRoute() {
  if (typeof window === 'undefined') return 'home'

  // 1. Check hash first (e.g. #scholarships, #terms, #/help)
  const hashRaw = (window.location.hash || '').replace(/^#[/]?/, '').trim().toLowerCase()
  if (hashRaw) {
    return hashRaw.split('?')[0].replace(/\/+$/, '')
  }

  // 2. Fall back to pathname (e.g. /scholarships, /terms, /accessibility)
  const pathRaw = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase()
  if (pathRaw && pathRaw !== 'index.html') {
    return pathRaw.split('?')[0]
  }

  return 'home'
}

function AppContent() {
  const [showLogin, setShowLogin] = useState(false)
  const [loginInitialMode, setLoginInitialMode] = useState('login')
  
  // Current logged in user object: { token, id, email, name, role }
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const rawUser = localStorage.getItem('auth_user')
      const token = localStorage.getItem('auth_token') || localStorage.getItem('provider_token') || localStorage.getItem('admin_token') || localStorage.getItem('student_token')
      if (rawUser && token) {
        const parsed = JSON.parse(rawUser)
        return { ...parsed, token }
      }
    } catch { /* ignore parse error */ }
    return null
  })

  // Dynamic route resolution supporting both hash (#) and pathname (/)
  const [activeSection, setActiveSection] = useState(resolveRoute)

  useEffect(() => {
    const handleRouteChange = () => {
      const target = resolveRoute()
      setActiveSection(target)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const openLogin = (mode = 'login') => {
    setLoginInitialMode(mode === 'register' ? 'register' : 'login')
    setShowLogin(true)
  }

  // Intercept direct navigation to #login / #register route aliases
  useEffect(() => {
    if (activeSection === 'login' || activeSection === 'signin' || activeSection === 'sign-in') {
      openLogin('login')
      setActiveSection('home')
    } else if (activeSection === 'register' || activeSection === 'signup' || activeSection === 'sign-up') {
      openLogin('register')
      setActiveSection('home')
    }
  }, [activeSection])

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('provider_token')
    localStorage.removeItem('student_token')
    setCurrentUser(null)
    setActiveSection('home')
    window.location.hash = '#home'
  }

  const role = currentUser?.role ? String(currentUser.role).toLowerCase() : null

  // Dynamic View Renderer based on User Role and Hash Route
  const renderMainContent = () => {
    // ── Unauthenticated (Public) Routes ────────────────────────────────
    if (!currentUser) {
      if (activeSection === 'provider-info' || activeSection === 'provider-guide' || activeSection === 'onboarding' || activeSection === 'partner') {
        return (
          <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fadeIn outline-none">
            <div className="modular-card p-8 md:p-12 mb-8">
              <div className="mb-8 flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h1 className="page-heading">Become a Scholarship Provider</h1>
                  <p className="body-text text-sm mt-1">Partner with ISKOLAR to publish scholarship grants and streamline applicant selection.</p>
                </div>
                <a href="#home" className="btn-secondary text-xs font-bold py-1.5 px-3 cursor-pointer">← Back to Home</a>
              </div>
              <Suspense fallback={<LoadingFallback />}>
                <ProviderGuide onLogin={() => openLogin('login')} onRegister={() => openLogin('register')} />
              </Suspense>
            </div>
          </main>
        )
      }

      // ── Scholarships Page ──────────────────────────────────────────
      if (activeSection === 'scholarships' || activeSection === 'grants' || activeSection === 'directory') {
        return (
          <PageWrapper
            title="Scholarships"
            subtitle="Browse verified scholarship opportunities from accredited foundations, government agencies, and corporations."
            badge="Grant Directory"
            accentColor="#305BFE"
          >
            <ScholarshipPreview onSelectScholarship={() => openLogin('login')} />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Ready to apply? Download the ISKOLAR mobile app.</p>
                <div className="flex gap-3 shrink-0">
                  <a href="#download" className="btn-action text-sm">Get the App →</a>
                  <button type="button" onClick={() => openLogin('login')} className="btn-secondary text-sm cursor-pointer">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── How It Works Page ──────────────────────────────────────────
      if (activeSection === 'how-it-works' || activeSection === 'process') {
        return (
          <PageWrapper
            title="How It Works"
            subtitle="From discovery to award — a clear, step-by-step walkthrough of the ISKOLAR application process."
            badge="Application Process"
            accentColor="#059669"
          >
            <HowItWorks />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Ready to get started? Browse open scholarships now.</p>
                <div className="flex gap-3 shrink-0">
                  <a href="#scholarships" className="btn-action text-sm">Browse Scholarships →</a>
                  <button type="button" onClick={() => openLogin('login')} className="btn-secondary text-sm cursor-pointer">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Eligibility Page ───────────────────────────────────────────
      if (activeSection === 'eligibility' || activeSection === 'features' || activeSection === 'criteria') {
        return (
          <PageWrapper
            title="Eligibility & Features"
            subtitle="Understand the requirements and capabilities the ISKOLAR platform provides to scholars and providers."
            badge="Scholarship Criteria"
            accentColor="#7C3AED"
          >
            <Features />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Find scholarships that match your qualifications.</p>
                <div className="flex gap-3 shrink-0">
                  <a href="#scholarships" className="btn-action text-sm">Browse Scholarships →</a>
                  <button type="button" onClick={() => openLogin('login')} className="btn-secondary text-sm cursor-pointer">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── About & Trust Page ─────────────────────────────────────────
      if (activeSection === 'safety' || activeSection === 'about' || activeSection === 'about-trust' || activeSection === 'security' || activeSection === 'data-protection') {
        return (
          <PageWrapper
            title="About & Trust"
            subtitle="How ISKOLAR safeguards applicant data, ensures human oversight, and maintains platform integrity."
            badge="Security & Trust"
            accentColor="#0EA5E9"
          >
            <About />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Ready to join a trusted scholarship platform?</p>
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={() => openLogin('login')} className="btn-action text-sm cursor-pointer">Sign In to ISKOLAR →</button>
                  <a href="#download" className="btn-secondary text-sm">Get the App</a>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Mobile App / Download Page ─────────────────────────────────
      if (activeSection === 'download' || activeSection === 'mobile' || activeSection === 'app' || activeSection === 'student-app') {
        return (
          <PageWrapper
            title="ISKOLAR Mobile App"
            subtitle="Student scholarship access is exclusively through the official ISKOLAR Android and iOS mobile application."
            badge="Mobile Platform"
            accentColor="#F59E0B"
          >
            <Download />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Are you a scholarship provider? Sign in to the web portal.</p>
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={() => openLogin('login')} className="btn-action text-sm cursor-pointer">Provider Sign In →</button>
                  <a href="#scholarships" className="btn-secondary text-sm">Browse Scholarships</a>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Privacy Policy Page ─────────────────────────────────────────
      if (activeSection === 'privacy' || activeSection === 'privacy-policy' || activeSection === 'data-privacy') {
        return (
          <PageWrapper
            title="Privacy Policy"
            subtitle="Philippine Data Privacy Act of 2012 (RA 10173) Governance & Protections"
            badge="Compliance"
            accentColor="#10B981"
          >
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
              <Suspense fallback={<LoadingFallback />}>
                <PrivacyPolicyPage />
              </Suspense>
            </div>
          </PageWrapper>
        )
      }

      // ── Terms of Service Page ───────────────────────────────────────
      if (activeSection === 'terms' || activeSection === 'terms-of-service' || activeSection === 'terms-of-use' || activeSection === 'tos') {
        return (
          <PageWrapper
            title="Terms of Service"
            subtitle="Platform governance, applicant responsibilities, and provider compliance standards for ISKOLAR."
            badge="Legal Agreement"
            accentColor="#305BFE"
          >
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
              <Suspense fallback={<LoadingFallback />}>
                <TermsPage />
              </Suspense>
            </div>
          </PageWrapper>
        )
      }

      // ── Accessibility Statement Page ────────────────────────────────
      if (activeSection === 'accessibility' || activeSection === 'accessibility-statement' || activeSection === 'a11y') {
        return (
          <PageWrapper
            title="Accessibility Statement"
            subtitle="Committed to barrier-free digital access for all Filipino students, reviewers, and institutions."
            badge="Inclusion & Standards"
            accentColor="#10B981"
          >
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
              <Suspense fallback={<LoadingFallback />}>
                <AccessibilityPage />
              </Suspense>
            </div>
          </PageWrapper>
        )
      }

      // ── Help Center & FAQs Page ─────────────────────────────────────
      if (activeSection === 'help' || activeSection === 'faq' || activeSection === 'faqs' || activeSection === 'help-center' || activeSection === 'support' || activeSection === 'contact') {
        return (
          <PageWrapper
            title="Help Center & FAQs"
            subtitle="Clear answers for student applicants, verified scholarship providers, and institutional partners."
            badge="Knowledge Base"
            accentColor="#6366F1"
          >
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
              <Suspense fallback={<LoadingFallback />}>
                <HelpFaqPage onContactSupport={() => { window.location.href = 'mailto:iskolar.official@gmail.com' }} />
              </Suspense>
            </div>
          </PageWrapper>
        )
      }

      // ── Home / Default Landing (short, focused) ────────────────────
      if (activeSection === 'home' || activeSection === '') {
        return (
          <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none">
            <Hero onLogin={() => openLogin('login')} />
            <ProcessStrip />
            <FinalCTA onLogin={() => openLogin('login')} />
          </main>
        )
      }

      // ── Protected Provider/Admin Gate when not authenticated ──────
      if (activeSection.startsWith('providers') || activeSection.startsWith('admin')) {
        return (
          <PageWrapper
            title="Authorized Portal Sign In Required"
            subtitle="The requested section is reserved for verified Scholarship Providers and Administrators."
            badge="Authentication Guard"
            accentColor="#305BFE"
          >
            <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
              <p className="body-text text-sm">
                Please authenticate using your verified organization credentials to access this dashboard.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button type="button" onClick={() => openLogin('login')} className="btn-action text-sm justify-center cursor-pointer">
                  Sign In to Portal →
                </button>
                <a href="#home" className="btn-secondary text-sm justify-center cursor-pointer">
                  ← Back to Home
                </a>
              </div>
            </div>
          </PageWrapper>
        )
      }

      // ── 404 Not Found for unrecognized routes ──────────────────────
      return (
        <Suspense fallback={<LoadingFallback />}>
          <NotFoundPage onNavigateHome={() => { window.location.hash = '#home'; }} onLogin={() => openLogin('login')} />
        </Suspense>
      )
    }

    // ── Authenticated: Provider / Admin Workspace ──────────────────────
    if (role === 'provider' || role === 'sponsor' || role === 'admin' || role === 'administrator') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProviderDashboard onLogout={handleLogout} />
        </Suspense>
      )
    }

    // ── Authenticated: Student (Web Portal Blocked) ────────────────────
    if (role === 'student' || role === 'applicant') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <StudentRedirectNotice user={currentUser} onLogout={handleLogout} />
        </Suspense>
      )
    }

    // ── Fallback ───────────────────────────────────────────────────────
    if (activeSection === 'home' || activeSection === '') {
      return (
        <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none">
          <Hero onLogin={() => openLogin('login')} />
          <ProcessStrip />
          <FinalCTA onLogin={() => openLogin('login')} />
        </main>
      )
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage onNavigateHome={() => { window.location.hash = '#home'; }} onLogin={() => openLogin('login')} />
      </Suspense>
    )
  }

  const isPortalRole = role === 'provider' || role === 'sponsor' || role === 'admin' || role === 'administrator' || role === 'student' || role === 'applicant'

  return (
    <div className="min-h-screen relative w-full max-w-full overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to Main Content
      </a>

      {!isPortalRole && (
        <Navbar
          currentUser={currentUser}
          activeSection={activeSection}
          onLogin={(mode) => openLogin(mode || 'login')}
          onRegister={() => openLogin('register')}
          onLogout={handleLogout}
        />
      )}

      <div className="relative z-10 w-full max-w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {!isPortalRole && <Footer />}

      <AnimatePresence>
        {showLogin && (
          <Suspense fallback={null}>
            <LoginModal
              open={showLogin}
              initialMode={loginInitialMode}
              onClose={() => setShowLogin(false)}
              onLoginSuccess={handleLoginSuccess}
              onProviderLogin={() => {
                setShowLogin(false)
                window.location.hash = '#providers'
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AppContent />
      </MotionConfig>
    </ThemeProvider>
  )
}
