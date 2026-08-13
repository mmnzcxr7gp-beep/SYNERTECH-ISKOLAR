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
    <div className="max-w-3xl mx-auto p-6 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-6 text-left">
      <div className="border-b border-slate-850 pb-4">
        <h2 className="text-3xl font-extrabold text-white">{policy.title}</h2>
        <p className="text-sm text-slate-400 mt-2">Last Updated: {policy.lastUpdated}</p>
      </div>

      <div className="space-y-6 text-slate-300">
        {policy.sections.map((section, index) => (
          <div key={index} className="space-y-2">
            <h3 className="text-lg font-bold text-white">{section.heading}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
