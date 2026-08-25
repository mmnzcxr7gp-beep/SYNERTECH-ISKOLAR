import React from 'react'

export default function SpotlightCard({ children, className = '', style = {}, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-colors ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
