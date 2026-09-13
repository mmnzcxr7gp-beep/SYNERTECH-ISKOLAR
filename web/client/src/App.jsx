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
const TypographyDocPage = lazy(() => import('./components/TypographyDocPage'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12 min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" style={{ borderColor: 'var(--color-accent-blue, #2563eb)' }} />
  </div>
)

function AppContent() {
  const [showLogin, setShowLogin] = useState(false)
  
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

  // Hash-based navigation section
  const [activeSection, setActiveSection] = useState(() => {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase()
    return hash || 'home'
  })

  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash || '').replace('#', '').toLowerCase()
      setActiveSection(hash || 'home')
      // Smooth scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const openLogin = () => setShowLogin(true)

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
    // ── Dev / Utility Pages ────────────────────────────────────────────
    if (activeSection === 'typography') {
      return (
        <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none py-4">
          <Suspense fallback={<LoadingFallback />}>
            <TypographyDocPage />
          </Suspense>
        </main>
      )
    }

    // ── Unauthenticated (Public) Routes ────────────────────────────────
    if (!currentUser) {
      if (activeSection === 'provider-info') {
        return (
          <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fadeIn outline-none">
            <div className="modular-card p-8 md:p-12 mb-8">
              <div className="mb-8 flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h1 className="page-heading">Become a Scholarship Provider</h1>
                  <p className="body-text text-sm mt-1">Partner with ISKOLAR to publish scholarship grants and streamline applicant selection.</p>
                </div>
                <a href="#home" className="btn-secondary text-xs font-bold py-1.5 px-3">← Back to Home</a>
              </div>
              <Suspense fallback={<LoadingFallback />}>
                <ProviderGuide onLogin={openLogin} />
              </Suspense>
            </div>
          </main>
        )
      }

      // ── Scholarships Page ──────────────────────────────────────────
      if (activeSection === 'scholarships') {
        return (
          <PageWrapper
            title="Scholarships"
            subtitle="Browse verified scholarship opportunities from accredited foundations, government agencies, and corporations."
            badge="Grant Directory"
            accentColor="#305BFE"
          >
            <ScholarshipPreview onSelectScholarship={openLogin} />
            <section className="py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="body-text text-sm">Ready to apply? Download the ISKOLAR mobile app.</p>
                <div className="flex gap-3 shrink-0">
                  <a href="#download" className="btn-action text-sm">Get the App →</a>
                  <button type="button" onClick={openLogin} className="btn-secondary text-sm">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── How It Works Page ──────────────────────────────────────────
      if (activeSection === 'how-it-works') {
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
                  <button type="button" onClick={openLogin} className="btn-secondary text-sm">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Eligibility Page ───────────────────────────────────────────
      if (activeSection === 'eligibility') {
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
                  <button type="button" onClick={openLogin} className="btn-secondary text-sm">Sign In</button>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── About & Trust Page ─────────────────────────────────────────
      if (activeSection === 'safety' || activeSection === 'about' || activeSection === 'about-trust') {
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
                  <button type="button" onClick={openLogin} className="btn-action text-sm">Sign In to ISKOLAR →</button>
                  <a href="#download" className="btn-secondary text-sm">Get the App</a>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Mobile App / Download Page ─────────────────────────────────
      if (activeSection === 'download') {
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
                  <button type="button" onClick={openLogin} className="btn-action text-sm">Provider Sign In →</button>
                  <a href="#scholarships" className="btn-secondary text-sm">Browse Scholarships</a>
                </div>
              </div>
            </section>
          </PageWrapper>
        )
      }

      // ── Home / Default Landing (short, focused) ────────────────────
      return (
        <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none">
          <Hero onLogin={openLogin} />
          <ProcessStrip />
          <FinalCTA onLogin={openLogin} />
        </main>
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
    return (
      <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none">
        <Hero onLogin={openLogin} />
        <ProcessStrip />
        <FinalCTA onLogin={openLogin} />
      </main>
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
          onLogin={openLogin}
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
