import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeContext'
import IskolarLogo from './IskolarLogo'
import { SunIcon, MoonIcon } from './Icons'

export default function Navbar({ currentUser, activeSection, onLogin, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef(null)

  const role = currentUser?.role ? String(currentUser.role).toLowerCase() : null
  const isLoggedIn = !!currentUser

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const roleLabel = (() => {
    if (role === 'admin' || role === 'administrator') return { label: 'Administrator', dotColor: 'bg-[#FF6D29]' }
    if (role === 'provider' || role === 'sponsor') return { label: 'Scholarship Provider', dotColor: 'bg-[#FF8552]' }
    if (role === 'student' || role === 'applicant') return { label: 'Student (Mobile Only)', dotColor: 'bg-emerald-500' }
    return null
  })()

  const navLinks = [
    { href: '#scholarships', label: 'Scholarships', id: 'scholarships' },
    { href: '#how-it-works', label: 'How It Works', id: 'how-it-works' },
    { href: '#eligibility', label: 'Eligibility', id: 'eligibility' },
    { href: '#safety', label: 'About & Trust', id: 'safety' },
    { href: '#download', label: 'Mobile App', id: 'download' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 px-4 md:px-8 py-3 bg-[var(--color-nav-bg)] border-b transition-colors" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Role Badge */}
          <div className="flex items-center gap-3">
            <a href="#home" className="transition hover:opacity-90 flex items-center" aria-label="Iskolar Home">
              <IskolarLogo size="sm" />
            </a>
            {roleLabel && (
              <span
                className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border"
                style={{
                  background: 'var(--color-bg-panel)',
                  color: 'var(--color-text-secondary)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <span className={`h-2 w-2 rounded-full ${roleLabel.dotColor} animate-pulse`}></span>
                <span>{roleLabel.label}</span>
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary Navigation">
            {!isLoggedIn && navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className="nav-text px-3.5 py-1.5 rounded-lg transition"
                  style={{
                    color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'var(--color-brand-subtle)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold border cursor-pointer hover:border-[var(--color-border-strong)]"
              style={{
                background: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title="Toggle Light/Dark Theme"
              aria-label="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-slate-700" />}
              <span className="hidden sm:inline text-xs">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {isLoggedIn ? (
              <button
                onClick={onLogout}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30 hover:bg-rose-500/20 transition cursor-pointer"
              >
                Log Out
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  type="button"
                  className="hidden sm:inline-flex btn-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                >
                  Sign In
                </button>
                <a
                  href="#download"
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Get Started
                </a>
              </>
            )}

            {/* Mobile Hamburger Button */}
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg border flex flex-col justify-center items-center gap-1 w-9 h-9 cursor-pointer transition hover:bg-[var(--color-bg-panel)]"
                style={{
                  backgroundColor: 'var(--color-bg-panel)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle mobile menu"
              >
                <span className={`h-0.5 w-4 bg-current rounded-full transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`h-0.5 w-4 bg-current rounded-full transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`h-0.5 w-4 bg-current rounded-full transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Drawer with Focus Trap and ESC handler */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'var(--color-bg-overlay)' }}
          />

          {/* Sliding Panel */}
          <div
            ref={mobileMenuRef}
            className="fixed right-0 top-0 bottom-0 w-[82vw] max-w-xs shadow-2xl flex flex-col justify-between p-6 border-l animate-fadeIn"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              paddingTop: 'max(24px, var(--safe-top))',
              paddingBottom: 'max(24px, var(--safe-bottom))',
              paddingRight: 'max(24px, var(--safe-right))',
            }}
          >
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <IskolarLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-lg font-bold transition hover:bg-[var(--color-bg-panel)] cursor-pointer"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <nav className="mt-6 space-y-1.5" aria-label="Mobile Drawer Navigation">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:bg-[var(--color-bg-panel)]"
                    style={{
                      color: activeSection === link.id ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                      backgroundColor: activeSection === link.id ? 'var(--color-brand-subtle)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Bottom Actions inside drawer */}
            <div className="pt-6 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogin()
                }}
                className="w-full btn-secondary py-2.5 px-4 text-xs font-bold text-center justify-center flex items-center shadow-sm cursor-pointer"
              >
                Sign In to Workspace
              </button>
              <a
                href="#download"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full btn-primary py-2.5 px-4 text-xs font-bold text-center justify-center flex items-center shadow-sm"
              >
                Get Mobile App
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
