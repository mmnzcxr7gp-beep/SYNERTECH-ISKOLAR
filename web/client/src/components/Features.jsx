import React from 'react'
import { SearchIcon, LockIcon, DocumentIcon, ChartIcon, PhoneIcon, CalendarIcon, ArrowRightIcon } from './Icons'

const modularFeatures = [
  {
    icon: <SearchIcon className="w-5 h-5 text-[#FF6D29]" />,
    number: '01',
    heading: 'Discover Scholarships',
    description: 'Filter verified grant opportunities by degree program, year level, GWA threshold, and household income without manual spreadsheet searches.',
    previewTitle: 'Multi-Parameter Search & Filter',
    previewItems: ['Course: BS Computer Science / Engineering', 'GWA Threshold: >= 1.75', 'Household Income: <= ₱300,000 / yr'],
    toneClass: 'section-white',
  },
  {
    icon: <LockIcon className="w-5 h-5 text-emerald-600" />,
    number: '02',
    heading: 'Submit Requirements Securely',
    description: 'Upload required documents directly into private Cloudflare R2 object storage with strict MIME validation, SHA-256 integrity hashes, and version tracking.',
    previewTitle: 'Encrypted Cloud Storage',
    previewItems: ['Driver: Cloudflare R2 (Private Bucket)', 'Integrity: SHA-256 Hash Verified', 'Access: Bearer JWT + Ownership Guard'],
    toneClass: 'section-warm',
  },
  {
    icon: <DocumentIcon className="w-5 h-5 text-sky-600" />,
    number: '03',
    heading: 'Review OCR-Extracted Information',
    description: 'Tesseract OCR automatically extracts key academic records, grades, and identification data. Students inspect, edit, and confirm every field before submission.',
    previewTitle: 'OCR Field Extraction & Pre-fill',
    previewItems: ['Student Full Name: Match Confirmed', 'GWA Extracted: 1.25 (User Verified)', 'School ID: PLM-2022-04918'],
    toneClass: 'section-orange-tint',
  },
  {
    icon: <ChartIcon className="w-5 h-5 text-indigo-600" />,
    number: '04',
    heading: 'Track Application Progress',
    description: 'Follow every stage of the evaluation lifecycle in real-time with an immutable timeline logging all human reviewer milestones and state transitions.',
    previewTitle: 'Real-Time State Machine',
    previewItems: ['Submitted → Automatic Check Completed', 'Pending Human Review → Shortlisted', 'Decision Logged: Approved with Grant Stipend'],
    toneClass: 'section-warm',
  },
  {
    icon: <PhoneIcon className="w-5 h-5 text-[#FF6D29]" />,
    number: '05',
    heading: 'Communicate with Providers',
    description: 'Engage in dedicated, secure messaging channels directly within each application thread for clarifications, document resubmissions, and official notices.',
    previewTitle: 'In-Thread Provider Messaging',
    previewItems: ['Channel: Protected Application Stream', 'Attachments: Encrypted Document Previews', 'Audit: Immutable Conversation Log'],
    toneClass: 'section-white',
  },
  {
    icon: <CalendarIcon className="w-5 h-5 text-emerald-600" />,
    number: '06',
    heading: 'Manage Interviews & Examinations',
    description: 'Sponsors coordinate interview dates, examination sessions, and candidate acknowledgments with real-time push alerts and calendar synchronization.',
    previewTitle: 'Panel Scheduling Coordinator',
    previewItems: ['Session: Technical Evaluation Panel', 'Format: Virtual Meeting / On-Campus', 'Status: Candidate Acknowledged'],
    toneClass: 'section-orange-tint',
  },
]

export default function Features() {
  return (
    <section id="eligibility" className="py-16 md:py-24 relative" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border"
            style={{
              backgroundColor: 'var(--color-bg-panel)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span className="h-2 w-2 rounded-full bg-[#FF6D29]"></span>
            <span>Platform Architecture & Capabilities</span>
          </div>

          <h2 id="features-heading" className="section-heading">
            Structured tools for students and scholarship providers.
          </h2>

          <p className="body-text text-base md:text-lg">
            Purpose-built workflows replace manual paperwork with transparent validation, student confirmation, and verifiable reviewer authority.
          </p>
        </div>

        {/* 6-Block Modular Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modularFeatures.map((item) => (
            <div
              key={item.number}
              className={`modular-card p-6 sm:p-7 flex flex-col justify-between ${item.toneClass}`}
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md border"
                    style={{
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)'
                    }}
                  >
                    MODULE {item.number}
                  </span>
                </div>

                {/* Heading & Description */}
                <div>
                  <h3 className="card-heading mb-2">
                    {item.heading}
                  </h3>
                  <p className="body-text text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Interface Preview Block */}
              <div className="mt-6 pt-5 border-t space-y-2.5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-heading)]">
                  {item.previewTitle}
                </div>
                <div className="space-y-1.5 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.previewItems.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-1.5">
                      <span className="text-[#FF6D29]">›</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
