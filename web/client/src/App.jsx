import React, { useEffect, useState, Suspense, lazy } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
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
    if (activeSection === 'typography') {
      return (
        <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none py-4">
          <Suspense fallback={<LoadingFallback />}>
            <TypographyDocPage />
          </Suspense>
        </main>
      )
    }

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

      // Default Clean Modular Landing View
      return (
        <main id="main-content" tabIndex={-1} className="animate-fadeIn outline-none">
          <Hero onLogin={openLogin} />
          <ProcessStrip />
          <ScholarshipPreview onSelectScholarship={openLogin} />
          <HowItWorks />
          <Features />
          <About />
          <Download />
          <FinalCTA onLogin={openLogin} />
        </main>
      )
    }

    // Provider / Sponsor / Admin / Administrator Role Views: Full-featured Workspace Dashboard Shell
    if (role === 'provider' || role === 'sponsor' || role === 'admin' || role === 'administrator') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProviderDashboard onLogout={handleLogout} />
        </Suspense>
      )
    }

    // Student / Applicant Role Views: Strictly prohibited on Web Portal
    if (role === 'student' || role === 'applicant') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <StudentRedirectNotice user={currentUser} onLogout={handleLogout} />
        </Suspense>
      )
    }

    // Default Fallback Landing Page
    return (
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Hero onLogin={openLogin} />
        <ProcessStrip />
        <ScholarshipPreview onSelectScholarship={openLogin} />
        <HowItWorks />
        <Features />
        <About />
        <Download />
        <FinalCTA onLogin={openLogin} />
      </main>
    )
  }

  const isPortalRole = role === 'provider' || role === 'sponsor' || role === 'admin' || role === 'administrator' || role === 'student' || role === 'applicant'

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}>
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

      <div className="relative z-10">
        {renderMainContent()}
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
