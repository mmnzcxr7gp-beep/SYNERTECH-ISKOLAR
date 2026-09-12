import React from 'react'
import { CheckIcon, DocumentIcon, SearchIcon, PhoneIcon, ChartIcon, BoltIcon } from './Icons'

const workflowSteps = [
  {
    step: '1',
    title: 'Browse',
    description: 'Explore verified scholarship opportunities from accredited foundations, corporations, and universities.',
    icon: <SearchIcon className="w-5 h-5 text-[#305BFE]" />,
  },
  {
    step: '2',
    title: 'Apply',
    description: 'Complete the standardized application on the ISKOLAR Mobile App with academic history and background details.',
    icon: <DocumentIcon className="w-5 h-5 text-emerald-600" />,
  },
  {
    step: '3',
    title: 'Upload Documents',
    description: 'Attach required transcripts, certificates of registration, and income records securely into private cloud storage.',
    icon: <BoltIcon className="w-5 h-5 text-sky-600" />,
  },
  {
    step: '4',
    title: 'Review Extracted Data',
    description: 'Tesseract OCR reads key data points. Students inspect, edit, and confirm extracted values before final submission.',
    icon: <CheckIcon className="w-5 h-5 text-indigo-600" />,
  },
  {
    step: '5',
    title: 'Provider Review',
    description: 'Sponsor review committees evaluate submissions, conduct interviews, and coordinate candidate qualifications.',
    icon: <ChartIcon className="w-5 h-5 text-[#305BFE]" />,
  },
  {
    step: '6',
    title: 'Receive Decision',
    description: 'Receive real-time notifications with detailed disbursement instructions or clear reviewer feedback.',
    icon: <PhoneIcon className="w-5 h-5 text-emerald-600" />,
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 section-warm" aria-labelledby="how-it-works-heading">
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
            <span>Lifecycle Walkthrough</span>
          </div>

          <h2 id="how-it-works-heading" className="section-heading">
            How the ISKOLAR application lifecycle works.
          </h2>

          <p className="body-text text-base md:text-lg">
            From initial opportunity discovery to final award confirmation, every step is coordinated with transparency and student confirmation.
          </p>
        </div>

        {/* 6-Step Visual Progression Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {workflowSteps.map((item) => (
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
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-[#305BFE]/10 text-[#93ABFF]">
                    STEP {item.step}
                  </span>
                </div>

                <h3 className="card-heading">
                  {item.title}
                </h3>

                <p className="body-text text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t flex items-center gap-2 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#305BFE]"></span>
                <span>Standardized Workflow</span>
              </div>
            </div>
          ))}
        </div>

        {/* Explicit OCR Legal Disclaimer Callout */}
        <div
          className="modular-card p-5 sm:p-6 border-l-4 border-l-[#305BFE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-1">
            <div className="text-sm font-bold flex items-center gap-2 text-[var(--color-text-heading)]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">Notice</span>
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
            Review Security Architecture
          </a>
        </div>

      </div>
    </section>
  )
}
