import React, { useState, useEffect } from 'react'
import IskolarLogo from './IskolarLogo'

export default function Footer() {
  const [systemStatus, setSystemStatus] = useState('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.status === 'ok' || data.status === 'alive') {
          setSystemStatus('operational')
        } else {
          setSystemStatus('degraded')
        }
      })
      .catch(() => {
        setSystemStatus('unavailable')
      })
  }, [])

  return (
    <footer className="border-t section-white transition-colors relative z-10" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        
        {/* Main Footer Row */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] pb-12 border-b" style={{ borderColor: 'var(--color-border)' }}>
          
          {/* Brand & Mission Statement */}
          <div className="space-y-4">
            <IskolarLogo size="sm" />
            <p className="body-text text-sm max-w-sm">
              ISKOLAR is an academic scholarship desk connecting Filipino college students with verified scholarship providers through transparent applications, document-assisted verification, and structured evaluation.
            </p>
            
            {/* Live System Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border"
              style={{
                backgroundColor: 'var(--color-bg-panel)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className={`h-2 w-2 rounded-full ${
                systemStatus === 'operational'
                  ? 'bg-emerald-500 animate-pulse'
                  : systemStatus === 'degraded'
                  ? 'bg-amber-500 animate-pulse'
                  : systemStatus === 'unavailable'
                  ? 'bg-rose-500'
                  : 'bg-sky-500 animate-pulse'
              }`}></span>
              <span>
                System: {
                  systemStatus === 'operational'
                    ? 'All Systems Operational'
                    : systemStatus === 'degraded'
                    ? 'Performance Degraded'
                    : systemStatus === 'unavailable'
                    ? 'Server Offline'
                    : 'Checking Status...'
                }
              </span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
              Platform
            </div>
            <ul className="space-y-2 text-sm">
              <li><a href="#scholarships" className="body-text hover:text-[#305BFE] transition">Browse Scholarships</a></li>
              <li><a href="#how-it-works" className="body-text hover:text-[#305BFE] transition">How It Works</a></li>
              <li><a href="#eligibility" className="body-text hover:text-[#305BFE] transition">Eligibility Modules</a></li>
              <li><a href="#download" className="body-text hover:text-[#305BFE] transition">Mobile Application</a></li>
            </ul>
          </div>

          {/* Governance & Trust */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
              Governance & Trust
            </div>
            <ul className="space-y-2 text-sm">
              <li><a href="#safety" className="body-text hover:text-[#305BFE] transition">Security & Privacy</a></li>
              <li><a href="#about" className="body-text hover:text-[#305BFE] transition">Data Protection</a></li>
              <li><a href="#accessibility" className="body-text hover:text-[#305BFE] transition">Accessibility Statement</a></li>
              <li><a href="#terms" className="body-text hover:text-[#305BFE] transition">Terms of Service</a></li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
              Support & Inquiries
            </div>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:iskolar.official@gmail.com" className="body-text hover:text-[#305BFE] transition">iskolar.official@gmail.com</a></li>
              <li><a href="#help" className="body-text hover:text-[#305BFE] transition">Help Center & FAQs</a></li>
              <li><a href="#provider-info" className="body-text hover:text-[#305BFE] transition">Provider Onboarding</a></li>
              <li><span className="meta-text text-xs">Metro Manila, Philippines</span></li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Attribution Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>© 2026 ISKOLAR. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span className="font-semibold text-[var(--color-text-heading)]">Created and developed by Sam Irian Villaluna · SYNERTECH</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#privacy" className="hover:text-[#305BFE] transition">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-[#305BFE] transition">Terms of Use</a>
            <span>•</span>
            <a href="#accessibility" className="hover:text-[#305BFE] transition">Accessibility</a>
          </div>
        </div>

      </div>
    </footer>
  )
}
