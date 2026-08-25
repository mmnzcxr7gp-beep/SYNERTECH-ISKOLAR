import React from 'react'

export default function TypographyDocPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-12">
      {/* Header */}
      <header className="border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#FF6D29] mb-1">
              Design System Specification
            </div>
            <h1 className="text-page-title">Unified Typography System</h1>
            <p className="text-body mt-2 max-w-2xl text-[var(--color-text-secondary)]">
              The official typography identity for the ISKOLAR 2.0 Web Portal and Mobile Application, engineered for academic excellence, trust, and high-readability accessibility.
            </p>
          </div>
          <a href="#home" className="btn-secondary text-xs">
            ← Back to Home
          </a>
        </div>
      </header>

      {/* Font Families Section */}
      <section className="space-y-6">
        <h2 className="text-section-title">1. Font Pairing & Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manrope */}
          <div className="modular-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF6D29]">Primary Font</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">--font-heading</span>
            </div>
            <div className="text-2xl font-bold font-['Manrope']" style={{ fontFamily: 'var(--font-heading)' }}>
              Manrope
            </div>
            <p className="text-caption">
              Modern geometric sans-serif with high legibility and confident authority for titles, headers, navigation, and primary controls.
            </p>
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold text-[var(--color-text-heading)]">Required Weights:</div>
              <div className="text-[var(--color-text-secondary)]">800 (ExtraBold), 700 (Bold), 600 (SemiBold), 500 (Medium)</div>
            </div>
          </div>

          {/* Source Sans 3 */}
          <div className="modular-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Secondary Font</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">--font-body</span>
            </div>
            <div className="text-2xl font-bold font-['Source_Sans_3']" style={{ fontFamily: 'var(--font-body)' }}>
              Source Sans 3
            </div>
            <p className="text-caption">
              Highly readable, professional academic tone tailored for body paragraphs, forms, tables, metadata, and long-form reading.
            </p>
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold text-[var(--color-text-heading)]">Required Weights:</div>
              <div className="text-[var(--color-text-secondary)]">400 (Regular), 500 (Medium), 600 (SemiBold)</div>
            </div>
          </div>

          {/* IBM Plex Mono */}
          <div className="modular-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Technical Font</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">--font-technical</span>
            </div>
            <div className="text-2xl font-bold font-['IBM_Plex_Mono']" style={{ fontFamily: 'var(--font-technical)' }}>
              IBM Plex Mono
            </div>
            <p className="text-caption">
              Monospace font used strictly for application IDs, document references, OCR confidence values, and audit logs.
            </p>
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold text-[var(--color-text-heading)]">Required Weights:</div>
              <div className="text-[var(--color-text-secondary)]">400 (Regular), 500 (Medium), 600 (SemiBold)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Web Typography Hierarchy Table */}
      <section className="space-y-6">
        <h2 className="text-section-title">2. Web Hierarchy Scale</h2>
        <div className="modular-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}>
                  <th className="p-4 text-table-header">Role / Level</th>
                  <th className="p-4 text-table-header">Typeface & Weight</th>
                  <th className="p-4 text-table-header">Size & Line Height</th>
                  <th className="p-4 text-table-header">Live Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <td className="p-4 font-semibold text-sm">Display / Hero</td>
                  <td className="p-4 text-xs font-mono">Manrope ExtraBold (800)</td>
                  <td className="p-4 text-xs font-mono">clamp(44px, 6vw, 64px) / 1.1</td>
                  <td className="p-4"><span className="text-display text-2xl">Empowering Scholars</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">H1 / Page Title</td>
                  <td className="p-4 text-xs font-mono">Manrope Bold (700)</td>
                  <td className="p-4 text-xs font-mono">clamp(36px, 4vw, 48px) / 1.17</td>
                  <td className="p-4"><span className="text-page-title text-xl">Scholarship Portal</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">H2 / Main Section</td>
                  <td className="p-4 text-xs font-mono">Manrope Bold (700)</td>
                  <td className="p-4 text-xs font-mono">clamp(30px, 3vw, 40px) / 1.2</td>
                  <td className="p-4"><span className="text-section-title text-lg">Available Grants</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">H3 / Subsection</td>
                  <td className="p-4 text-xs font-mono">Manrope SemiBold (600)</td>
                  <td className="p-4 text-xs font-mono">clamp(24px, 2.5vw, 32px) / 1.25</td>
                  <td className="p-4"><span className="text-subsection-title text-base">Eligibility Criteria</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">H4 / Card Heading</td>
                  <td className="p-4 text-xs font-mono">Manrope SemiBold (600)</td>
                  <td className="p-4 text-xs font-mono">20–24px / 1.33</td>
                  <td className="p-4"><span className="text-card-title text-sm">STEM Leadership Grant</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Body Large</td>
                  <td className="p-4 text-xs font-mono">Source Sans 3 Regular (400)</td>
                  <td className="p-4 text-xs font-mono">18px / 28px</td>
                  <td className="p-4"><span className="text-body-large">Connecting students with verified opportunities.</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Body</td>
                  <td className="p-4 text-xs font-mono">Source Sans 3 Regular (400)</td>
                  <td className="p-4 text-xs font-mono">16px / 24px</td>
                  <td className="p-4"><span className="text-body">Submit your application documents for automated screening.</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Secondary Text</td>
                  <td className="p-4 text-xs font-mono">Source Sans 3 Regular (400)</td>
                  <td className="p-4 text-xs font-mono">15px / 22px</td>
                  <td className="p-4"><span className="text-secondary">Official transcript from accredited university.</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Caption / Meta</td>
                  <td className="p-4 text-xs font-mono">Source Sans 3 Regular (400)</td>
                  <td className="p-4 text-xs font-mono">14px / 20px</td>
                  <td className="p-4"><span className="text-caption">Updated 2 hours ago • Required</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Button</td>
                  <td className="p-4 text-xs font-mono">Manrope SemiBold (600)</td>
                  <td className="p-4 text-xs font-mono">15–16px / 22px</td>
                  <td className="p-4"><span className="btn-primary text-xs py-1 px-3">Apply Now</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Technical / Reference</td>
                  <td className="p-4 text-xs font-mono">IBM Plex Mono Medium (500)</td>
                  <td className="p-4 text-xs font-mono">13–14px / 18–20px</td>
                  <td className="p-4"><span className="text-technical font-mono text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded">APP-2026-0891</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile Typography Hierarchy Comparison */}
      <section className="space-y-6">
        <h2 className="text-section-title">3. Mobile Hierarchy Scale (Flutter)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="modular-card p-6 space-y-4">
            <h3 className="text-card-title text-base">Mobile Heading Hierarchy (Manrope)</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-lg">Mobile Display (36sp / 800)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">displayLarge</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-base">Mobile H1 (30sp / 700)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">headlineLarge</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-sm">Mobile H2 (26sp / 700)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">headlineMedium</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-semibold text-sm">Mobile H3 (22sp / 600)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">headlineSmall / titleLarge</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-xs">Mobile Card Title (18sp / 600)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">titleMedium</span>
              </div>
            </div>
          </div>

          <div className="modular-card p-6 space-y-4">
            <h3 className="text-card-title text-base">Mobile Body & Controls (Source Sans 3)</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span>Mobile Body Large (18sp / 400)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">bodyLarge</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span>Mobile Body (16sp / 400)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">bodyMedium</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span>Mobile Secondary (14sp / 400)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">bodySmall</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-semibold">Form Label (14sp / 600)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">labelMedium</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-[#FF6D29]">Button (15sp / 600 Manrope)</span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">labelLarge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OCR & Technical Reference Patterns */}
      <section className="space-y-6">
        <h2 className="text-section-title">4. OCR Review & Data Typography</h2>
        <div className="modular-card p-6 space-y-4">
          <p className="text-body text-sm">
            Document review interfaces clearly separate OCR extracted text, student-confirmed corrections, and technical audit identifiers:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}>
              <div className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-1">OCR Raw Extracted Value</div>
              <div className="font-mono text-sm font-medium text-amber-500">GWA: 1.250 (Conf: 94.2%)</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">Tesseract v7.0.0 Engine</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}>
              <div className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-1">Student Confirmed Value</div>
              <div className="text-sm font-semibold text-[var(--color-text-heading)]">General Weighted Average: 1.25</div>
              <div className="text-xs text-emerald-500 mt-1 font-medium">✓ Verified by Applicant</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-panel)' }}>
              <div className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-1">System Audit Identifier</div>
              <div className="font-mono text-xs font-medium text-slate-300">DOC-HASH: e3b0c44298fc...</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">Storage: applications/154/v1</div>
            </div>
          </div>
        </div>
      </section>

      {/* Correct vs Incorrect Usage Guidelines */}
      <section className="space-y-6">
        <h2 className="text-section-title">5. Usage Rules & Accessibility</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Correct */}
          <div className="modular-card p-6 space-y-3 border-l-4 border-l-emerald-500">
            <div className="text-sm font-bold text-emerald-500 flex items-center gap-2">
              <span>✓</span> Approved Typography Practice
            </div>
            <ul className="text-sm space-y-2 text-[var(--color-text-secondary)] list-disc pl-5">
              <li>Use <strong>Manrope</strong> for all headings, hero titles, buttons, tabs, and navigation links.</li>
              <li>Use <strong>Source Sans 3</strong> for paragraphs, descriptions, input fields, labels, and table content.</li>
              <li>Limit <strong>IBM Plex Mono</strong> exclusively to IDs, hash codes, and technical audit data.</li>
              <li>Maintain minimum 16px body text on web and 16sp on mobile for form inputs.</li>
              <li>Support 200% text scaling without layout clipping or fixed-height overflow.</li>
            </ul>
          </div>

          {/* Incorrect */}
          <div className="modular-card p-6 space-y-3 border-l-4 border-l-rose-500">
            <div className="text-sm font-bold text-rose-500 flex items-center gap-2">
              <span>✕</span> Prohibited Typography Patterns
            </div>
            <ul className="text-sm space-y-2 text-[var(--color-text-secondary)] list-disc pl-5">
              <li>Do NOT use monospace fonts for general paragraphs, buttons, or navigation.</li>
              <li>Do NOT mix arbitrary unapproved font families (e.g. Montserrat, Inter, Open Sans).</li>
              <li>Do NOT apply synthetic bolding (`font-weight: 900` or double-styling).</li>
              <li>Do NOT use fixed pixel heights on text containers that clip at 150% or 200% scale.</li>
              <li>Do NOT use typography styling alone without text labels to indicate status.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
