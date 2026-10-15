import React from 'react'
import { ShieldIcon, LockIcon, DocumentIcon, CheckCircleIcon, ArrowRightIcon } from './Icons'

export default function About() {
  return (
    <section id="safety" className="py-16 md:py-24 section-warm" aria-labelledby="safety-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Section Context Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
            <span>Security & Data Governance</span>
          </div>

          <h2 id="safety-heading" className="section-heading text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-text-heading)]">
            Privacy, Institutional Trust, and Human-in-the-Loop Review
          </h2>

          <p className="body-text text-base md:text-lg leading-relaxed">
            ISKOLAR enforces strict role boundaries, encrypted document storage, and human decision-making throughout the scholarship evaluation cycle.
          </p>
        </div>

        {/* Editorial Layout: Narrative Dossier Left, Compliance Desk Card Right */}
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] items-start">

          {/* Narrative Dossier */}
          <div className="space-y-6">
            <div
              className="card-modern p-6 sm:p-7 space-y-3"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#305BFE]">
                <LockIcon className="w-4 h-4 shrink-0" />
                <span>1. Private Document Storage with Pre-Signed Access</span>
              </div>
              <h3 className="card-heading text-lg font-bold">
                No Public Document Directories
              </h3>
              <p className="body-text text-xs sm:text-sm leading-relaxed">
                Applicant transcripts, Certificates of Registration, and family income certificates are stored in private Cloudflare R2 object storage. Direct public file browsing is strictly prohibited. Download and inspection URLs are short-lived, pre-signed tokens granted only to authenticated reviewers with explicit scholarship authority.
              </p>
            </div>

            <div
              className="card-modern p-6 sm:p-7 space-y-3"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600">
                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                <span>2. Student Confirmation of OCR-Extracted Fields</span>
              </div>
              <h3 className="card-heading text-lg font-bold">
                Transparent Machine Extraction
              </h3>
              <p className="body-text text-xs sm:text-sm leading-relaxed">
                Optical character recognition (Tesseract OCR) assists by reading document fields to reduce manual typing errors. However, students review, verify, and confirm all extracted GWA and income numbers before final application submission. OCR output is never treated as authoritative truth without human validation.
              </p>
            </div>

            <div
              className="card-modern p-6 sm:p-7 space-y-3"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold text-sky-600">
                <ShieldIcon className="w-4 h-4 shrink-0" />
                <span>3. Human-Controlled Decision Authority</span>
              </div>
              <h3 className="card-heading text-lg font-bold">
                Automated Rules Assist, Humans Decide
              </h3>
              <p className="body-text text-xs sm:text-sm leading-relaxed">
                Eligibility algorithms provide sorting and pre-screening assistance to committee reviewers, but no applicant is approved, rejected, or disqualified by an automated script. Every final grant award requires explicit administrative signature and human decision-making.
              </p>
            </div>
          </div>

          {/* Compliance & Standards Desk Card */}
          <div
            className="card-modern p-6 sm:p-8 space-y-5"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <div className="pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#305BFE] block">
                  Legal & Technical Baseline
                </span>
                <h4 className="text-base font-bold text-[var(--color-text-heading)]">
                  Data Privacy Act Compliance
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                RA 10173
              </span>
            </div>

            <div className="space-y-4 text-xs body-text leading-relaxed">
              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-[var(--color-text-heading)] block">Explicit Consent Recording</span>
                <p>Both student applicants and participating providers must give explicit consent to privacy policies prior to account creation.</p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-[var(--color-text-heading)] block">Role Separation & Isolation</span>
                <p>Students operate exclusively on Flutter mobile; scholarship providers and administrators manage reviews on the web portal. Cross-client horizontal privilege escalation is prevented at the API middleware layer.</p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-[var(--color-text-heading)] block">Immutable Audit Trails</span>
                <p>Every review state transition, interview appointment, and decision update generates a permanent, timestamped audit entry recording actor ID and context.</p>
              </div>
            </div>

            <div className="pt-2 border-t flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <a
                href="#privacy"
                className="btn-secondary text-xs font-bold py-2.5 px-4 text-center justify-center flex items-center gap-1.5"
              >
                <span>Read Full Privacy Policy</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
