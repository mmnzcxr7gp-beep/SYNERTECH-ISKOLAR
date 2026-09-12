import React from 'react'
import { ShieldIcon, LockIcon, DocumentIcon, ChartIcon, CheckIcon } from './Icons'

const trustPillars = [
  {
    icon: <LockIcon className="w-5 h-5 text-[#305BFE]" />,
    title: 'Private Document Storage',
    description: 'Uploaded applicant records are stored in private Cloudflare R2 cloud object storage with SHA-256 integrity hashing and strict bearer token ownership validation.',
  },
  {
    icon: <CheckIcon className="w-5 h-5 text-emerald-600" />,
    title: 'Student Confirmation of OCR Data',
    description: 'Optical character recognition assists by reading document fields, but students review, edit, and confirm every extracted value before final submission.',
  },
  {
    icon: <ShieldIcon className="w-5 h-5 text-sky-600" />,
    title: 'Human Review Authority',
    description: 'Automated rules assist pre-screening and eligibility calculations, but final approval, rejection, and award decisions are strictly human-controlled.',
  },
  {
    icon: <ChartIcon className="w-5 h-5 text-indigo-600" />,
    title: 'Role-Based Access Separation',
    description: 'Strict client and platform isolation prevents horizontal privilege escalation. Students operate on Flutter mobile; sponsors manage reviews on the web portal.',
  },
  {
    icon: <DocumentIcon className="w-5 h-5 text-[#305BFE]" />,
    title: 'Application Audit History',
    description: 'Every state transition, document resubmission request, and decision note is recorded in an immutable, timestamped audit log for academic compliance.',
  },
]

export default function About() {
  return (
    <section id="safety" className="py-16 md:py-24 section-warm" aria-labelledby="safety-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
            <span>Security & Data Governance</span>
          </div>

          <h2 id="safety-heading" className="section-heading">
            Privacy, trust, and human-in-the-loop review.
          </h2>

          <p className="body-text text-base md:text-lg">
            ISKOLAR implements transparent data safeguards, student verification steps, and role-based permissions throughout the evaluation cycle.
          </p>
        </div>

        {/* 2-Column Grid: Pillars Left, Architecture Card Right */}
        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] items-start">
          
          {/* Left Column: Trust Pillars List */}
          <div className="grid gap-4 sm:grid-cols-2">
            {trustPillars.map((item, idx) => (
              <div
                key={item.title}
                className={`modular-card p-5 sm:p-6 space-y-2.5 ${idx === 4 ? 'sm:col-span-2' : ''}`}
                style={{ backgroundColor: 'var(--color-bg-elevated)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center border"
                    style={{
                      backgroundColor: 'var(--color-bg-panel)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="card-heading text-base font-bold">
                    {item.title}
                  </h3>
                </div>

                <p className="body-text text-xs sm:text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Verified Standard Card */}
          <div
            className="modular-card p-6 sm:p-8 space-y-5"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
                Data Protection Protocol
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Standards
              </span>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <div className="font-bold text-[var(--color-text-heading)]">1. Pre-Registration Privacy Consent</div>
                <p className="text-xs">Students and providers must explicitly accept data processing policies prior to registration.</p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <div className="font-bold text-[var(--color-text-heading)]">2. No Plaintext Document Storage</div>
                <p className="text-xs">Direct public directory access is disabled. File retrieval requires authenticated API token validation.</p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <div className="font-bold text-[var(--color-text-heading)]">3. Auditable Decision Authority</div>
                <p className="text-xs">Automated scoring serves as a sorting aid; all final awarding decisions are signed by authorized reviewers.</p>
              </div>
            </div>

            <div className="pt-2 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              <span>Compliance: Philippine Data Privacy Act (RA 10173) Architecture Baseline</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
