import React from 'react'

/**
 * PageWrapper — shared page shell for each dedicated nav section.
 * Renders a compact hero banner, breadcrumb, and then the page content.
 */
export default function PageWrapper({ title, subtitle, badge, accentColor = '#305BFE', children, prevPage, prevLabel }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="outline-none min-h-screen"
    >
      {/* Page Hero Banner — compact, not a scroll section */}
      <div
        className="w-full py-10 md:py-14 border-b"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-panel) 100%)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mb-4" aria-label="Breadcrumb">
            <a
              href="#home"
              className="transition font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Home
            </a>
            <span style={{ color: 'var(--color-text-muted)' }}>›</span>
            <span className="font-semibold" style={{ color: accentColor }}>
              {title}
            </span>
          </nav>

          {/* Badge + Title + Subtitle */}
          <div className="max-w-3xl space-y-3">
            {badge && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-widest uppercase border"
                style={{
                  backgroundColor: `${accentColor}12`,
                  color: accentColor,
                  borderColor: `${accentColor}30`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                {badge}
              </span>
            )}
            <h1 className="page-heading text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="body-text text-base md:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="w-full">
        {children}
      </div>
    </main>
  )
}
