import React, { useState } from 'react'

const faqCategories = [
  {
    category: 'Student Applicants',
    items: [
      {
        q: 'How do I apply for scholarships on ISKOLAR?',
        a: 'College students must use the official ISKOLAR Mobile App (available for Android APK and iOS) to register an account, browse eligible scholarships, upload documents, and track evaluation milestones. The web portal is reserved exclusively for scholarship providers and administrators.'
      },
      {
        q: 'Why can’t I submit applications through the website?',
        a: 'The student application workflow is restricted to mobile clients to enforce device security, prevent automated bot submissions, ensure live camera document capture authenticity, and protect personal records under the Data Privacy Act.'
      },
      {
        q: 'What credentials and documents can I upload?',
        a: 'Supported documents include official School ID cards, Certificates of Registration (COR), Official Transcript of Records (TOR) or Grade Slips, and Certificates of Indigency or Income Tax Returns (ITR). Documents can be submitted as digital PDFs or high-resolution images (PNG, JPG, JPEG).'
      },
      {
        q: 'What is the pre-screening check?',
        a: 'Before finalizing your application submission, the system runs an automated pre-screening check against the scholarship’s published criteria (such as minimum GWA, eligible degree programs, and required documents). If any criterion is unmet, the app provides actionable advice on what to correct.'
      }
    ]
  },
  {
    category: 'Scholarship Providers & Sponsors',
    items: [
      {
        q: 'How can our organization become an accredited provider?',
        a: 'Click "Register Organization" or visit the Provider Information page. Complete the multi-step accreditation form with your organization details (SEC registration number, authorized representative, official contact). Platform administrators verify credentials within 1–2 business days.'
      },
      {
        q: 'How do providers evaluate and rank applicants?',
        a: 'Providers can configure custom evaluation criteria (e.g., GWA weight, financial need, examination scores, and interview performance). The system calculates composite objective scores according to Philippine academic grading scales, presenting a structured ranking table with full auditability.'
      },
      {
        q: 'Can criteria be changed after students have applied?',
        a: 'No. To ensure procedural fairness, once the first application has been submitted, criteria are locked against direct editing. Any necessary modifications require an audited criteria revision that creates a new version while preserving existing submissions.'
      },
      {
        q: 'How are interviews and exams scheduled?',
        a: 'Providers can create interview and examination slots directly from the Interview & Exam Scheduling tab in their dashboard. Candidates receive instant notifications and can acknowledge or request rescheduling.'
      }
    ]
  },
  {
    category: 'Document & OCR Verification',
    items: [
      {
        q: 'Does OCR automatically approve or reject documents?',
        a: 'No. OCR technology extracts text (such as student names, ID numbers, and GWA) to save students from manual typing errors. Final verification authority always rests with designated human reviewers.'
      },
      {
        q: 'What happens if a document is blurry or unreadable?',
        a: 'If a scan is low-quality or lacks clear text, the system routes the document to designated administrative review without auto-rejection, allowing reviewers to inspect the file manually and request a clearer upload if necessary.'
      },
      {
        q: 'Are scanned image-only PDFs supported for OCR?',
        a: 'Direct text-based PDFs and images (PNG, JPG) are fully processed by the OCR engine. Scanned image-only PDFs that contain no embedded digital text are identified and applicants are guided to upload either an official digital PDF or a high-resolution image.'
      }
    ]
  },
  {
    category: 'Account & Security',
    items: [
      {
        q: 'How is student data protected?',
        a: 'All files are stored in private Cloudflare R2 object storage with signed URL access controls, SHA-256 integrity validation, and end-to-end encryption. All processing adheres to the Philippine Data Privacy Act of 2012 (RA 10173).'
      },
      {
        q: 'How do I reset my password?',
        a: 'Use the "Forgot Password" link on the login screen. An OTP verification code will be sent to your registered email address to verify your identity before setting a new password.'
      },
      {
        q: 'Who do I contact for technical support?',
        a: 'You can email our support team directly at iskolar.official@gmail.com with your account details or error screenshot. We strive to assist all inquiries promptly.'
      }
    ]
  }
]

export default function HelpFaqPage({ onLogin }) {
  const [activeCategory, setActiveCategory] = useState('Student Applicants')
  const [openIndices, setOpenIndices] = useState({ 'Student Applicants-0': true })
  const [searchQuery, setSearchQuery] = useState('')

  const toggleAccordion = (key) => {
    setOpenIndices((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const currentGroup = faqCategories.find((c) => c.category === activeCategory) || faqCategories[0]

  const filteredItems = searchQuery.trim()
    ? faqCategories.flatMap((c) =>
        c.items
          .filter(
            (i) =>
              i.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              i.a.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((i) => ({ ...i, category: c.category }))
      )
    : null

  return (
    <div className="w-full space-y-8">
      {/* Top Header */}
      <div className="pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(48, 91, 254, 0.10)',
            color: '#305BFE',
            borderColor: 'rgba(48, 91, 254, 0.25)'
          }}
        >
          Knowledge Base & Support
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
          Help Center & Frequently Asked Questions
        </h1>
        <p className="mt-2 text-xs sm:text-base font-normal max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
          Find answers about student applications, scholarship provider onboarding, OCR verification, and system policies.
        </p>

        {/* Quick Search */}
        <div className="mt-6 max-w-lg">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs by topic or keyword (e.g., OCR, mobile app, criteria)..."
            className="w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition focus:border-[#305BFE]"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
      </div>

      {/* Category Tabs (if not searching) */}
      {!searchQuery.trim() && (
        <div className="flex flex-wrap gap-2 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {faqCategories.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setActiveCategory(cat.category)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeCategory === cat.category
                  ? 'bg-[#305BFE] text-white shadow-sm'
                  : 'hover:bg-[var(--color-bg-panel)]'
              }`}
              style={{
                color: activeCategory === cat.category ? '#ffffff' : 'var(--color-text-secondary)',
                backgroundColor: activeCategory === cat.category ? '#305BFE' : 'transparent',
                border: activeCategory === cat.category ? 'none' : '1px solid var(--color-border)'
              }}
            >
              {cat.category}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredItems ? (
          filteredItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border" style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                No questions found matching "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 btn-secondary text-xs px-3 py-1.5"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const key = `search-${idx}`
              const isOpen = openIndices[key] !== false // default open for search
              return (
                <div
                  key={key}
                  className="rounded-2xl border overflow-hidden transition"
                  style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(key)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--color-bg-panel)]"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#305BFE] block mb-1">
                        {item.category}
                      </span>
                      <span className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-text-heading)' }}>
                        {item.q}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-[var(--color-text-muted)] ml-3 shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm leading-relaxed border-t pt-3" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })
          )
        ) : (
          currentGroup.items.map((item, idx) => {
            const key = `${activeCategory}-${idx}`
            const isOpen = !!openIndices[key]
            return (
              <div
                key={key}
                className="rounded-2xl border overflow-hidden transition"
                style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(key)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--color-bg-panel)]"
                >
                  <span className="text-sm sm:text-base font-bold pr-3" style={{ color: 'var(--color-text-heading)' }}>
                    {item.q}
                  </span>
                  <span className="text-lg font-bold text-[var(--color-text-muted)] shrink-0">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm leading-relaxed border-t pt-3" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Support Card */}
      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}
      >
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
            Still have questions?
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Our administrator support desk is available to assist students, universities, and scholarship foundations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="mailto:iskolar.official@gmail.com"
            className="btn-action text-xs font-bold px-4 py-2.5"
          >
            Email Support Desk
          </a>
          <button
            type="button"
            onClick={onLogin}
            className="btn-secondary text-xs font-bold px-4 py-2.5"
          >
            Provider Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
