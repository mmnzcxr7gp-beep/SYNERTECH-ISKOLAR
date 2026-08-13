import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from './ThemeContext'
import IskolarLogo from './IskolarLogo'

export default function Navbar({ currentUser, activeSection, onLogin, onLogout }) {
  const { theme, toggleTheme } = useTheme()

  const role = currentUser?.role ? String(currentUser.role).toLowerCase() : null
  const isLoggedIn = !!currentUser

  const roleLabel = (() => {
    if (role === 'admin') return { label: 'Admin', dotColor: 'bg-indigo-400' }
    if (role === 'provider' || role === 'sponsor') return { label: 'Provider', dotColor: 'bg-cyan-400' }
    if (role === 'student' || role === 'applicant') return { label: 'Student', dotColor: 'bg-emerald-400' }
    return null
  })()

  return (
    <motion.header initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="sticky top-4 z-40 px-4 md:px-8">
      <div className="container mx-auto">
        <div className="navcard flex items-center justify-between gap-4 py-3 px-4 md:px-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/60 shadow-lg" style={{ background: 'var(--nav-bg)', backdropFilter: 'var(--nav-blur)', borderColor: 'var(--border)' }}>
          
          {/* Logo & Minimalist Role Badge */}
          <div className="flex items-center gap-3">
            <a href="#home" className="transition hover:opacity-90">
              <IskolarLogo size="sm" />
            </a>
            {roleLabel && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-800/80 text-slate-200 border border-slate-700/60">
                <span className={`h-1.5 w-1.5 rounded-full ${roleLabel.dotColor}`}></span>
                <span>{roleLabel.label}</span>
              </span>
            )}
          </div>

          {/* Vibrant Navigation Links per Role */}
          <nav className="hidden md:flex items-center gap-2 text-xs lg:text-sm font-medium">
            {!isLoggedIn && (
              <>
                <a
                  href="#features"
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    activeSection === 'features'
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-extrabold shadow-md shadow-cyan-500/25 border border-cyan-400/40'
                      : 'text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  Why Iskolar
                </a>

                <a
                  href="#about"
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    activeSection === 'about'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold shadow-md shadow-emerald-500/25 border border-emerald-400/40'
                      : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  Benefits
                </a>

                <a
                  href="#download"
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    activeSection === 'download'
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-extrabold shadow-md shadow-violet-500/25 border border-violet-400/40'
                      : 'text-slate-300 hover:text-violet-400 hover:bg-violet-500/10'
                  }`}
                >
                  Mobile App
                </a>

                <a
                  href="#provider-info"
                  className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                    activeSection === 'provider-info'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold shadow-md shadow-amber-500/25 border border-amber-400/40'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  Become a Provider
                </a>
              </>
            )}

            {role === 'admin' && (
              <>
                <a href="#admin/applicants" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/applicants' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Applicants</a>
                <a href="#admin/scholarships" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/scholarships' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Scholarships</a>
                <a href="#admin/documents" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/documents' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Verification</a>
                <a href="#admin/opportunities" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/opportunities' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Opportunities</a>
                <a href="#admin/scheduling" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/scheduling' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Schedules</a>
                <a href="#admin/reports" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/reports' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Reports</a>
                <a href="#admin/settings" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'admin/settings' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Settings</a>
              </>
            )}

            {(role === 'provider' || role === 'sponsor') && (
              <>
                <a href="#providers" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'providers' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Dashboard</a>
                <a href="#providers/scholarships" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'providers/scholarships' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>My Scholarships</a>
                <a href="#providers/applicants" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'providers/applicants' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Applicants</a>
                <a href="#providers/scheduling" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'providers/scheduling' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Schedules</a>
                <a href="#providers/settings" className={`px-3 py-1.5 rounded-xl transition ${activeSection === 'providers/settings' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:text-white'}`}>Settings</a>
              </>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5 text-xs font-bold border border-slate-700/50"
              title="Toggle Light/Dark Theme"
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {isLoggedIn ? (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition shadow-sm"
              >
                Log Out
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="btn-primary py-2 px-5 text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
