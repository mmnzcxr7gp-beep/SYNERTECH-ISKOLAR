import React from 'react'

const termsSections = [
  {
    heading: '1. Acceptance of Terms',
    content: 'By accessing or using the ISKOLAR platform (including the web portal at iskolar.org, the mobile application, and related services), you agree to be bound by these Terms of Service, all applicable laws and regulations in the Republic of the Philippines, and our Privacy Policy. If you do not agree with any of these terms, you are prohibited from using or accessing this platform.'
  },
  {
    heading: '2. User Accounts & Platform Separation',
    content: '• Student Applicants: Student scholarship discovery, document submission, and evaluation tracking are conducted exclusively through the official ISKOLAR Android and iOS mobile applications to safeguard identity security and credential integrity.\n• Scholarship Providers & Administrators: Accredited educational foundations, universities, government agencies, and corporate sponsors manage grant programs and evaluate applicants exclusively through the authenticated web portal.\n• Account Security: Users are responsible for maintaining the confidentiality of their credentials and for all activities that occur under their account.'
  },
  {
    heading: '3. Application Integrity & Document Truthfulness',
    content: 'All information, certificates, grades, and identity records submitted through ISKOLAR must be truthful, authentic, and accurate. The submission of forged, altered, or fraudulent credentials will result in immediate disqualification, permanent account revocation, and possible referral to appropriate educational authorities. Automated document analysis tools (such as OCR and cross-account duplication checks) assist in screening, but designated human reviewers hold exclusive authority over evaluation decisions.'
  },
  {
    heading: '4. Scholarship Provider Obligations',
    content: 'Accredited scholarship providers agree to:\n• Publish accurate eligibility criteria, award amounts, deadlines, and requirements.\n• Comply with fair evaluation standards without unlawful discrimination.\n• Protect applicant personal information in strict accordance with the Philippine Data Privacy Act of 2012 (RA 10173).\n• Refrain from modifying active eligibility criteria in an arbitrary manner once applications have been submitted, adhering to ISKOLAR audited criteria revision controls.'
  },
  {
    heading: '5. Intellectual Property & License',
    content: 'The ISKOLAR logo, software architecture, mobile client, user interface designs, and documentation are proprietary intellectual property developed by Sam Irian Villaluna and SYNERTECH. Users may not decompile, reverse engineer, or commercially exploit any portion of the platform without express prior written consent.'
  },
  {
    heading: '6. Limitation of Liability',
    content: 'ISKOLAR provides a facilitating bridge between applicants and scholarship providers. While we strive for 100% platform uptime and verified listings, ISKOLAR does not guarantee grant selection or scholarship disbursement, which remains under the independent authority of each individual provider foundation or agency.'
  },
  {
    heading: '7. Governing Law & Dispute Resolution',
    content: 'These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any legal action or proceeding arising under these terms shall be instituted in the competent courts of Metro Manila, Philippines.'
  },
  {
    heading: '8. Contact Information',
    content: 'For questions regarding these Terms of Service or institutional agreements, please reach out to our legal and administrative desk at iskolar.official@gmail.com.'
  }
]

export default function TermsPage() {
  return (
    <div className="w-full space-y-6">
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
          Legal Agreement
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
          ISKOLAR Terms of Service
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>
          Effective Date: October 2026 · Governing Entity: SYNERTECH / ISKOLAR
        </p>
      </div>

      <div className="rounded-2xl border p-6 sm:p-8 space-y-6" style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}>
        {termsSections.map((section, index) => (
          <div key={index} className="space-y-2 pb-5 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>
              {section.heading}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
