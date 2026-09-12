import React from 'react'

export default function TypographyDocPage() {
  return (
    <div className="content-container py-10 space-y-12">
      {/* Header */}
      <header className="border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#305BFE] mb-1">
              Design System Specification
            </div>
            <h1 className="text-page-title">Enterprise Typography & Token System</h1>
            <p className="text-body mt-2 max-w-2xl text-[var(--color-text-secondary)]">
              The official ISKOLAR 2.0 design identity for the Web Portal and Mobile Application, engineered with Poppins geometric typography for modern clarity, defense-ready elegance, and WCAG AA accessibility.
            </p>
          </div>
          <a href="#home" className="btn-secondary text-xs">
            ← Back to Home
          </a>
        </div>
      </header>

      {/* Font Stack Section */}
      <section className="space-y-6">
        <h2 className="text-section-title">1. Typography System</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="modular-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#305BFE]">Primary Brand Stack</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">--font-heading</span>
            </div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Poppins
            </div>
            <p className="text-caption">
              Modern geometric font stack loaded via Google Fonts with robust system fallbacks (Inter, system-ui, -apple-system, sans-serif) across all mobile and web interfaces.
            </p>
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold text-[var(--color-text-heading)]">Approved Weights:</div>
              <div className="text-[var(--color-text-secondary)]">Regular (400), Medium (500), Semibold (600), Bold (700), Extra-bold (800)</div>
            </div>
          </div>

          <div className="modular-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Technical Monospace Stack</span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">--font-technical</span>
            </div>
            <div className="text-xl font-medium font-mono" style={{ fontFamily: 'var(--font-technical)' }}>
              SFMono / Consolas / Menlo
            </div>
            <p className="text-caption">
              Monospace font stack reserved exclusively for cryptographic hashes, document IDs, application references, timestamps, and audit log entries.
            </p>
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold text-[var(--color-text-heading)]">Specification:</div>
              <div className="text-[var(--color-text-secondary)]">Tabular numbers enabled, zero letter-spacing variation</div>
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
                <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-warm)' }}>
                  <th className="p-4 text-table-header">Role / Level</th>
                  <th className="p-4 text-table-header">Weight & Family</th>
                  <th className="p-4 text-table-header">Size & Line Height</th>
                  <th className="p-4 text-table-header">Live Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <td className="p-4 font-semibold text-sm">Display / Hero</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">40px / 52px</td>
                  <td className="p-4"><span className="text-display text-2xl">Empowering Scholars</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Page Title (H1)</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">32px / 40px</td>
                  <td className="p-4"><span className="text-page-title text-xl">Scholarship Portal</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Section Title (H2)</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">24px / 32px</td>
                  <td className="p-4"><span className="text-section-title text-lg">Available Grants</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Card Title (H3)</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">20px / 28px</td>
                  <td className="p-4"><span className="text-card-title text-base">STEM Excellence Fund</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Subtitle / Section Subhead</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">16px / 24px</td>
                  <td className="p-4"><span className="text-subtitle">Applicant Verification Status</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Body Text</td>
                  <td className="p-4 text-xs">Regular (400)</td>
                  <td className="p-4 text-xs font-mono">14px / 20px</td>
                  <td className="p-4"><span className="text-body">Submit verified academic records and enrollment certificate.</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Form Label</td>
                  <td className="p-4 text-xs">Semibold (600)</td>
                  <td className="p-4 text-xs font-mono">14px / 20px</td>
                  <td className="p-4"><span className="text-form-label">Full Legal Name</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Supporting / Metadata</td>
                  <td className="p-4 text-xs">Regular (400)</td>
                  <td className="p-4 text-xs font-mono">12px / 16px</td>
                  <td className="p-4"><span className="text-caption">Last updated 2 hours ago • Verified by Provider</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-sm">Table Cell</td>
                  <td className="p-4 text-xs">Regular (400)</td>
                  <td className="p-4 text-xs font-mono">14px / 20px</td>
                  <td className="p-4"><span className="text-table-body">PLM-2022-0912 • BS Computer Science</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Semantic Color Tokens */}
      <section className="space-y-6">
        <h2 className="text-section-title">3. Semantic Status Badges & Contrast (WCAG 2.2 AA)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="modular-card p-4 text-center space-y-2">
            <span className="status-badge badge-verified">✓ Verified</span>
            <div className="text-xs text-[var(--color-text-secondary)]">Success</div>
          </div>
          <div className="modular-card p-4 text-center space-y-2">
            <span className="status-badge badge-pending">⏱ Pending Review</span>
            <div className="text-xs text-[var(--color-text-secondary)]">Warning / In Progress</div>
          </div>
          <div className="modular-card p-4 text-center space-y-2">
            <span className="status-badge badge-danger">✗ Rejected</span>
            <div className="text-xs text-[var(--color-text-secondary)]">Error / Ineligible</div>
          </div>
          <div className="modular-card p-4 text-center space-y-2">
            <span className="status-badge badge-info">ℹ Resubmission</span>
            <div className="text-xs text-[var(--color-text-secondary)]">Action Required</div>
          </div>
          <div className="modular-card p-4 text-center space-y-2">
            <span className="status-badge badge-neutral">⊘ Inactive</span>
            <div className="text-xs text-[var(--color-text-secondary)]">Archived</div>
          </div>
        </div>
      </section>
    </div>
  )
}
