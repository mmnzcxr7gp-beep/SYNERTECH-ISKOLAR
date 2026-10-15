import React from 'react'

export default function NotFoundPage({ onNavigateHome, onLogin }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[70vh] flex items-center justify-center px-4 py-16 outline-none"
    >
      <div
        className="max-w-lg w-full p-8 sm:p-10 rounded-2xl border text-center space-y-6 shadow-sm"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.10)',
            color: '#DC2626',
            borderColor: 'rgba(239, 68, 68, 0.25)',
          }}
        >
          <span>Error 404 • Resource Not Found</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-heading)' }}>
          Page Not Found
        </h1>

        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          The section or page you are looking for does not exist, has been archived, or requires specific role authorization.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#home"
            onClick={onNavigateHome}
            className="btn-action w-full sm:w-auto text-center justify-center text-sm"
          >
            ← Return to Home
          </a>
          <a
            href="#scholarships"
            className="btn-secondary w-full sm:w-auto text-center justify-center text-sm"
          >
            Browse Scholarships
          </a>
        </div>
      </div>
    </main>
  )
}
