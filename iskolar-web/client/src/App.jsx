import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './components/ThemeContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import About from './components/About'
import Download from './components/Download'
import Footer from './components/Footer'
import LoginModal from './components/LoginModal'
import ProviderDashboard from './components/ProviderDashboard'
import ProviderGuide from './components/ProviderGuide'
import StudentRedirectNotice from './components/StudentRedirectNotice'

import ApplicantsPage from './components/ApplicantsPage'
import ScholarshipsPage from './components/ScholarshipsPage'
import DocumentVerificationPage from './components/DocumentVerificationPage'
import OpportunitiesManagementPage from './components/OpportunitiesManagementPage'
import ReportsPage from './components/ReportsPage'
import SchedulingPage from './components/SchedulingPage'
import SettingsPage from './components/SettingsPage'
import ScholarshipCreatePage from './components/ScholarshipCreatePage'

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
  const token = currentUser?.token || ''

  // Dynamic View Renderer based on User Role and Hash Route
  const renderMainContent = () => {
    if (!currentUser) {
      if (activeSection === 'features') {
        return (
          <main className="container mx-auto px-4 md:px-8 py-8 animate-fadeIn">
            <div className="glass-frame p-8 md:p-10 mb-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text-heading)' }}>Why Iskolar</h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Discover the platform features and capabilities designed for students and scholarship sponsors.</p>
                </div>
                <a href="#home" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">← Back to Home</a>
              </div>
              <Features />
            </div>
          </main>
        )
      }

      if (activeSection === 'about') {
        return (
          <main className="container mx-auto px-4 md:px-8 py-8 animate-fadeIn">
            <div className="glass-frame p-8 md:p-10 mb-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text-heading)' }}>Platform Benefits</h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>How ISKOLAR empowers students, simplifies verification, and automates awarding.</p>
                </div>
                <a href="#home" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">← Back to Home</a>
              </div>
              <About />
            </div>
          </main>
        )
      }

      if (activeSection === 'download') {
        return (
          <main className="container mx-auto px-4 md:px-8 py-8 animate-fadeIn">
            <div className="glass-frame p-8 md:p-10 mb-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text-heading)' }}>Mobile Application</h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Get the ISKOLAR Mobile App for Android & iOS to track applications anywhere.</p>
                </div>
                <a href="#home" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">← Back to Home</a>
              </div>
              <Download />
            </div>
          </main>
        )
      }

      if (activeSection === 'provider-info') {
        return (
          <main className="container mx-auto px-4 md:px-8 py-8 animate-fadeIn">
            <div className="glass-frame p-8 md:p-10 mb-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black" style={{ color: 'var(--text-heading)' }}>Become a Scholarship Provider</h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Partner with ISKOLAR to publish scholarship grants and streamline applicant selection.</p>
                </div>
                <a href="#home" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">← Back to Home</a>
              </div>
              <ProviderGuide onLogin={openLogin} />
            </div>
          </main>
        )
      }

      // Default Home Landing View
      return (
        <main className="animate-fadeIn">
          <Hero onLogin={openLogin} />
        </main>
      )
    }

    // Provider / Sponsor Role Views
    if (role === 'provider' || role === 'sponsor') {
      return <ProviderDashboard onLogout={handleLogout} />
    }

    // Admin Role Views
    if (role === 'admin') {
      if (activeSection === 'admin/scholarships') {
        return <ScholarshipsPage token={token} user={currentUser} />
      }
      if (activeSection === 'admin/documents') {
        return <DocumentVerificationPage token={token} user={currentUser} />
      }
      if (activeSection === 'providers/create' || activeSection === 'admin/create') {
        return <ScholarshipCreatePage token={token} onPublished={() => { window.location.hash = '#admin/scholarships' }} />
      }
      if (activeSection === 'admin/opportunities') {
        return <OpportunitiesManagementPage token={token} user={currentUser} />
      }
      if (activeSection === 'admin/reports') {
        return <ReportsPage token={token} user={currentUser} />
      }
      if (activeSection === 'admin/settings') {
        return <SettingsPage token={token} user={currentUser} />
      }
      if (activeSection === 'admin/scheduling') {
        return <SchedulingPage token={token} user={currentUser} />
      }
      return <ApplicantsPage token={token} user={currentUser} />
    }

    // Student / Applicant Role Views: Strictly prohibited on Web Portal
    if (role === 'student' || role === 'applicant') {
      return <StudentRedirectNotice user={currentUser} onLogout={handleLogout} />
    }

    // Default Fallback Landing Page
    return (
      <>
        <Hero onLogin={openLogin} />
        <Features />
        <ProviderGuide />
        <About />
        <Download />
      </>
    )
  }

  const isPortalRole = role === 'provider' || role === 'sponsor' || role === 'student' || role === 'applicant'

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Animated Liquid Background Blobs */}
      <div className="fluid-bg-container">
        <div className="fluid-blob fluid-blob-1"></div>
        <div className="fluid-blob fluid-blob-2"></div>
      </div>

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
          <LoginModal
            open={showLogin}
            onClose={() => setShowLogin(false)}
            onLoginSuccess={handleLoginSuccess}
            onProviderLogin={() => {
              setShowLogin(false)
              window.location.hash = '#providers'
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
