import React from 'react'
import { motion } from 'framer-motion'
import IskolarLogo from './IskolarLogo'
import { PhoneIcon } from './Icons'

export default function StudentRedirectNotice({ user, onLogout }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg p-8 md:p-10 rounded-3xl text-center shadow-2xl backdrop-blur-xl border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex justify-center mb-6">
          <IskolarLogo size="lg" />
        </div>

        <div
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase border mb-4"
          style={{
            backgroundColor: 'rgba(255, 109, 41, 0.10)',
            color: 'var(--primary)',
            borderColor: 'rgba(255, 109, 41, 0.25)'
          }}
        >
          <PhoneIcon className="w-3.5 h-3.5 text-[#FF6D29]" />
          <span>Mobile Platform Exclusive</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ color: 'var(--text-heading)' }}>
          Student Mobile Client Required
        </h1>

        <div
          className="p-4 rounded-2xl border mb-6 text-left space-y-2"
          style={{
            backgroundColor: 'var(--color-surface-panel)',
            borderColor: 'var(--border)'
          }}
        >
          <p className="text-sm leading-relaxed font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome, <strong style={{ color: 'var(--primary)' }}>{user?.name || user?.email || 'Student'}</strong>
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Student applications, document uploads, and OCR review workflows are strictly handled through the ISKOLAR mobile application to maintain secure multi-factor authentication and device integrity.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Please install the ISKOLAR app on your mobile device to search scholarships, upload documents, track application status, and view interview appointments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition shadow-sm cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}
