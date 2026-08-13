import React from 'react'

export default function IskolarLogo({ size = 'md', showText = true, className = '' }) {
  const iconDimensions = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }[size] || 'h-10 w-10'

  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size] || 'text-xl'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Premium Metallic Emblem Logo Container */}
      <div className={`relative ${iconDimensions} rounded-2xl overflow-hidden shadow-lg border border-[var(--primary)]/50 bg-[#161316] flex items-center justify-center transition-transform hover:scale-105`}>
        <img
          src="/logo.png"
          alt="ISKOLAR Logo"
          className="h-full w-full object-cover rounded-2xl scale-105"
          onError={(e) => {
            // Fallback SVG vector mark if image fails to render
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'block'
          }}
        />
        {/* SVG Fallback */}
        <svg
          style={{ display: 'none' }}
          className="h-full w-full text-[var(--primary)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" fill="rgba(255, 109, 41, 0.2)" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
          <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2" fill="var(--primary)" stroke="none" transform="scale(0.35) translate(22, 22)" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSize} font-black tracking-wider text-[var(--text-heading,#0D1E3B)]`}>
            ISKOLAR
          </span>
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted,#6B7C96)] uppercase -mt-1">
            Scholarship App
          </span>
        </div>
      )}
    </div>
  )
}
