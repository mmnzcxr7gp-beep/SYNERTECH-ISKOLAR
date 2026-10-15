import React from 'react'
import {
  BuildingIcon,
  ShieldIcon,
  DocumentIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckIcon
} from './Icons'

export default function ProviderGuide({ onLogin }) {
  return (
    <section id="provider-info" className="py-16 md:py-24 relative" aria-labelledby="provider-guide-title">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Section Header */}
        <div className="mb-12 max-w-3xl space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
            <span>Provider Accreditation & Onboarding</span>
          </div>

          <h2 id="provider-guide-title" className="section-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Partner with ISKOLAR to Empower Filipino Scholars
          </h2>

          <p className="body-text text-base sm:text-lg leading-relaxed font-normal">
            A secure web portal for accredited foundations, government scholarship programs, universities, and corporate sponsors to publish programs, evaluate documents, and disburse grant decisions.
          </p>
        </div>

        {/* 1. Eligible Organization Types */}
        <div className="mb-12">
          <h3 className="card-heading text-xl font-bold mb-4">
            Eligible Organization Types
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Higher Education Institutions',
                desc: 'State universities and colleges (SUCs), local colleges (LUCs), and private accredited HEIs with institutional grant programs.'
              },
              {
                title: 'Non-Profit Foundations',
                desc: 'SEC-registered non-stock, non-profit education foundations and philanthropic organizations.'
              },
              {
                title: 'Corporate CSR Initiatives',
                desc: 'Corporate scholarship foundations and industry leaders offering technology, engineering, and business fellowships.'
              },
              {
                title: 'LGU & Government Agencies',
                desc: 'Municipal, city, and provincial scholarship programs and national line agency educational assistance programs.'
              }
            ].map((type) => (
              <div
                key={type.title}
                className="card-modern p-5 space-y-2"
                style={{ backgroundColor: 'var(--color-bg-elevated)' }}
              >
                <div className="flex items-center gap-2">
                  <BuildingIcon className="w-4 h-4 text-[#305BFE]" />
                  <h4 className="text-sm font-bold text-[var(--color-text-heading)]">{type.title}</h4>
                </div>
                <p className="body-text text-xs leading-relaxed">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Accreditation Process & Required Details */}
        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          {/* Accreditation Stages */}
          <div
            className="card-modern p-6 sm:p-7 space-y-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <ShieldIcon className="w-5 h-5 text-[#305BFE]" />
              <h3 className="card-heading text-lg font-bold">The 4-Step Accreditation Process</h3>
            </div>
            <ol className="space-y-3.5 text-xs sm:text-sm">
              {[
                { step: '1', title: 'Provider Account Registration', desc: 'Representative creates an organizational account with official email and contact credentials.' },
                { step: '2', title: 'Accreditation Credentials Submission', desc: 'Submit registration certificates, representative authorization, and program charter.' },
                { step: '3', title: 'Platform Administrator Review', desc: 'Platform admins audit legal standing and verify official authorization within 1–2 business days.' },
                { step: '4', title: 'Grant Creation & Publishing Access', desc: 'Approved providers gain immediate access to post scholarship grants and review applicant dossiers.' }
              ].map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold w-6 h-6 rounded-full bg-[#305BFE]/10 text-[#305BFE] flex items-center justify-center shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <strong className="block text-[var(--color-text-heading)]">{s.title}</strong>
                    <span className="body-text text-xs">{s.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Required Organization Details */}
          <div
            className="card-modern p-6 sm:p-7 space-y-4"
            style={{ backgroundColor: 'var(--color-bg-elevated)' }}
          >
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <DocumentIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="card-heading text-lg font-bold">Required Verification Credentials</h3>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm body-text">
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Official Registered Organization Name & Legal Entity Type</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Government Registration Number (SEC / CDA / CHED / DepEd)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authorized Representative Full Name, Position & Official ID</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Official Institutional Email Address (organization domain preferred)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Physical Office Address and Verified Contact Numbers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Active Website or Verified Social Presence (if available)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Approval Status Explanations */}
        <div className="card-modern p-6 sm:p-7 mb-12" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
          <h3 className="card-heading text-lg font-bold mb-4">
            Understanding Provider Account Statuses
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                PENDING REVIEW
              </span>
              <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                Organization details submitted and awaiting administrator verification. Publishing is disabled.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                VERIFIED / ACTIVE
              </span>
              <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                Accreditation confirmed. Provider has full privileges to publish grants, review applicants, and schedule evaluations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                NEEDS INFORMATION
              </span>
              <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                Administrator requested clarification on registration files or representative authorization.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                REJECTED
              </span>
              <p className="text-xs text-[var(--color-text-secondary)] pt-1">
                Organization credentials could not be verified or did not meet eligibility standards.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Benefits of Using ISKOLAR & Action Bar */}
        <div
          className="card-modern p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <div className="space-y-2">
            <h3 className="card-heading text-xl font-bold">
              Ready to streamline your scholarship operations?
            </h3>
            <p className="body-text text-xs sm:text-sm max-w-xl">
              Access thousands of qualified Filipino college students, automated OCR document pre-screening, integrated interview coordination, and immutable audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onLogin}
              className="btn-action px-6 py-3 text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <span>Register as Provider</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="btn-secondary px-5 py-3 text-xs sm:text-sm font-bold"
            >
              Sign In to Portal
            </button>
          </div>
        </div>

      </div>
    </section>
  )
}
