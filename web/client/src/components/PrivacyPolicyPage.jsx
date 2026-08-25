import React, { useState, useEffect } from 'react'

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const baseUrl = import.meta?.env?.VITE_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetch(`${baseUrl}/api/privacy-policy`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load privacy policy')
        return res.json()
      })
      .then((data) => {
        setPolicy(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Privacy Policy...</div>
  if (error) return <div className="p-8 text-center text-rose-300">{error}</div>

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
          style={{
            backgroundColor: 'rgba(255, 109, 41, 0.10)',
            color: 'var(--primary)',
            borderColor: 'rgba(255, 109, 41, 0.25)'
          }}
        >
          Compliance & Legal
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
          {policy.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
          Last Updated: {policy.lastUpdated}
        </p>
      </div>

      <div className="rounded-2xl border p-6 space-y-6" style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border)' }}>
        {policy.sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>{section.heading}</h3>
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
