import React, { useState } from 'react'
import {
  PhoneIcon,
  CheckCircleIcon,
  SearchIcon,
  DocumentIcon,
  CheckIcon,
  ClockIcon,
  BuildingIcon,
  ShieldIcon,
  LockIcon,
  UsersIcon,
  CalendarIcon
} from './Icons'

const studentSteps = [
  {
    step: '1',
    title: 'Download the mobile application',
    description: 'Install the ISKOLAR app on your mobile device to securely manage your applications and documents.',
    icon: <PhoneIcon className="w-5 h-5 text-[#305BFE]" />
  },
  {
    step: '2',
    title: 'Create and verify an account',
    description: 'Register with your verified email address, set up two-factor security, and complete your student profile.',
    icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
  },
  {
    step: '3',
    title: 'Discover scholarships',
    description: 'Explore verified grant opportunities filtered by academic field, financial need, and university eligibility.',
    icon: <SearchIcon className="w-5 h-5 text-sky-600" />
  },
  {
    step: '4',
    title: 'Upload required documents',
    description: 'Submit official transcripts, Certificates of Registration, and BIR or Barangay income certifications.',
    icon: <DocumentIcon className="w-5 h-5 text-indigo-600" />
  },
  {
    step: '5',
    title: 'Confirm OCR-extracted information',
    description: 'Inspect and confirm OCR-read GWA, academic terms, and family income details before final submission.',
    icon: <CheckIcon className="w-5 h-5 text-emerald-600" />
  },
  {
    step: '6',
    title: 'Track the provider’s decision',
    description: 'Receive real-time notifications on screening results, scheduled interviews, and scholarship awards.',
    icon: <ClockIcon className="w-5 h-5 text-[#305BFE]" />
  }
]

const providerSteps = [
  {
    step: '1',
    title: 'Register an organization',
    description: 'Register your foundation, corporate CSR program, university, or government scholarship office.',
    icon: <BuildingIcon className="w-5 h-5 text-[#305BFE]" />
  },
  {
    step: '2',
    title: 'Submit accreditation details',
    description: 'Provide official registration credentials (SEC/CDA/CHED/DepEd) and authorized representative details.',
    icon: <ShieldIcon className="w-5 h-5 text-amber-600" />
  },
  {
    step: '3',
    title: 'Receive administrator approval',
    description: 'ISKOLAR platform administrators verify organization credentials before granting publishing permissions.',
    icon: <LockIcon className="w-5 h-5 text-indigo-600" />
  },
  {
    step: '4',
    title: 'Publish scholarship programs',
    description: 'Define slot quotas, eligibility criteria, required documents, allowance grants, and review deadlines.',
    icon: <DocumentIcon className="w-5 h-5 text-emerald-600" />
  },
  {
    step: '5',
    title: 'Review applicants and documents',
    description: 'Evaluate candidate submissions with side-by-side OCR verification, internal review notes, and ranking.',
    icon: <UsersIcon className="w-5 h-5 text-sky-600" />
  },
  {
    step: '6',
    title: 'Schedule evaluations and issue decisions',
    description: 'Coordinate panel interviews or exams, update applicant statuses, and disburse official decisions.',
    icon: <CalendarIcon className="w-5 h-5 text-[#305BFE]" />
  }
]

export default function HowItWorks() {
  const [activeWorkflow, setActiveWorkflow] = useState('student') // 'student' | 'provider'

  const activeSteps = activeWorkflow === 'student' ? studentSteps : providerSteps

  return (
    <section id="how-it-works" className="py-16 md:py-24 section-warm" aria-labelledby="how-it-works-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Section Header */}
        <div className="max-w-3xl mb-10 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[#305BFE]"></span>
            <span>Lifecycle Workflows</span>
          </div>

          <h2 id="how-it-works-heading" className="section-heading">
            How ISKOLAR Works
          </h2>

          <p className="body-text text-base md:text-lg">
            A transparent and structured platform connecting college scholars and scholarship providers with distinct, dedicated workflows.
          </p>
        </div>

        {/* Workflow Role Selector Tabs */}
        <div className="flex items-center gap-3 mb-10" role="tablist" aria-label="Select workflow role">
          <button
            type="button"
            role="tab"
            aria-selected={activeWorkflow === 'student'}
            id="tab-student"
            aria-controls="panel-student"
            onClick={() => setActiveWorkflow('student')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              activeWorkflow === 'student'
                ? 'bg-[#305BFE] text-white border-[#305BFE] shadow-sm'
                : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Student Workflow (Mobile App)
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeWorkflow === 'provider'}
            id="tab-provider"
            aria-controls="panel-provider"
            onClick={() => setActiveWorkflow('provider')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              activeWorkflow === 'provider'
                ? 'bg-[#305BFE] text-white border-[#305BFE] shadow-sm'
                : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Provider Workflow (Web Portal)
          </button>
        </div>

        {/* 6-Step Visual Progression Grid */}
        <div
          role="tabpanel"
          id={`panel-${activeWorkflow}`}
          aria-labelledby={`tab-${activeWorkflow}`}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10"
        >
          {activeSteps.map((item) => (
            <div
              key={item.step}
              className="card-modern p-6 sm:p-7 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-bg-elevated)' }}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: 'var(--color-bg-panel)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[#305BFE]/10 text-[#305BFE] dark:text-[#93ABFF]">
                    STEP {item.step}
                  </span>
                </div>

                <h3 className="card-heading text-base font-bold">
                  {item.title}
                </h3>

                <p className="body-text text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div
                className="mt-5 pt-4 border-t flex items-center gap-2 text-xs font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#305BFE]"></span>
                <span>{activeWorkflow === 'student' ? 'Student Mobile Step' : 'Provider Portal Step'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Role Action Prompt */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-heading)]">
              {activeWorkflow === 'student' ? 'Ready to apply for scholarships?' : 'Are you a scholarship foundation or sponsor?'}
            </h4>
            <p className="body-text text-xs sm:text-sm">
              {activeWorkflow === 'student'
                ? 'Download the ISKOLAR Android APK to discover opportunities and submit requirements.'
                : 'Register your organization today and gain administrator accreditation to post grants.'}
            </p>
          </div>
          <div>
            {activeWorkflow === 'student' ? (
              <a href="#download" className="btn-action text-xs font-bold px-4 py-2.5">
                Download Mobile App
              </a>
            ) : (
              <a href="#provider-info" className="btn-action text-xs font-bold px-4 py-2.5">
                Register as Provider
              </a>
            )}
          </div>
        </div>

        {/* Explicit OCR Legal Disclaimer Callout */}
        <div
          className="modular-card p-5 sm:p-6 border-l-4 border-l-[#305BFE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            <div className="text-sm font-bold flex items-center gap-2 text-[var(--color-text-heading)]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#305BFE]/10 text-[#305BFE] border border-[#305BFE]/20">Notice</span>
              <span>OCR Document Validation Policy</span>
            </div>
            <p className="body-text text-xs sm:text-sm">
              OCR technology assists data extraction from uploaded documents to reduce typing errors. It does <strong>not</strong> authenticate government or institutional identity credentials. Final review authority always remains with designated human reviewers.
            </p>
          </div>
          <a
            href="#safety"
            className="btn-secondary text-xs font-bold shrink-0"
          >
            Review Security & Privacy
          </a>
        </div>

      </div>
    </section>
  )
}
