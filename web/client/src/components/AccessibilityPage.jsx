import React from 'react'

const accessibilityCommitments = [
  {
    title: 'WCAG 2.1 Level AA Conformance',
    desc: 'The ISKOLAR portal is built to comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards, ensuring barrier-free navigation for users with visual, auditory, motor, and cognitive needs.'
  },
  {
    title: 'Full Keyboard Navigability',
    desc: 'All interactive elements, buttons, links, forms, and dialogs are accessible using standard keyboard navigation (Tab, Shift+Tab, Enter, Space, and Escape). Focus rings and skip-to-content links provide clear visual landmarks.'
  },
  {
    title: 'High Contrast & Dual Themes',
    desc: 'Both Light and Dark modes are engineered with a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text and interactive components, meeting strict readability benchmarks.'
  },
  {
    title: 'Semantic HTML & Screen Reader Support',
    desc: 'The application employs semantic HTML5 landmark tags (<header>, <nav>, <main>, <aside>, <footer>) with standard ARIA attributes (aria-label, aria-expanded, aria-labelledby) for seamless compatibility with NVDA, JAWS, VoiceOver, and TalkBack.'
  },
  {
    title: 'Text Scalability & Responsive Layout',
    desc: 'The interface scales up to 200% zoom without horizontal scrolling or loss of functionality. Fluid responsive typography preserves hierarchy on both desktop monitors and mobile displays.'
  },
  {
    title: 'Non-Reliance on Color Alone',
    desc: 'Status indicators (such as verification badges, alerts, and application states) use clear textual labels and distinct icons alongside color cues to support color-blind users.'
  }
]

export default function AccessibilityPage() {
  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.10)',
            color: '#10B981',
            borderColor: 'rgba(16, 185, 129, 0.25)'
          }}
        >
          Inclusion & Standards
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
          Accessibility Statement
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>
          Committed to Digital Accessibility for all Filipino Students and Reviewers
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {accessibilityCommitments.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border p-5 sm:p-6 space-y-2"
            style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-text-heading)' }}>
                {item.title}
              </h2>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Feedback & Contact Card */}
      <div
        className="rounded-2xl border p-6 sm:p-8 space-y-3"
        style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
          Accessibility Feedback & Inquiries
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          We continuously test and refine our platforms. If you encounter any accessibility barrier or require content in an alternative format, please contact our team at{' '}
          <a href="mailto:iskolar.official@gmail.com?subject=Accessibility%20Inquiry" className="text-[#305BFE] font-bold hover:underline">
            iskolar.official@gmail.com
          </a>
          . We prioritize accessibility issues and aim to respond within 24 to 48 hours.
        </p>
      </div>
    </div>
  )
}
