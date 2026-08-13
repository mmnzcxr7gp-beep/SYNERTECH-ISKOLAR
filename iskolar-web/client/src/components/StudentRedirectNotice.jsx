import React from 'react'
import { motion } from 'framer-motion'
import IskolarLogo from './IskolarLogo'

export default function StudentRedirectNotice({ user, onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: 'var(--bg-primary, #090d16)' }}>
      {/* Liquid background blobs */}
      <div className="fluid-bg-container">
        <div className="fluid-blob fluid-blob-1"></div>
        <div className="fluid-blob fluid-blob-2"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg p-8 md:p-10 rounded-[2.5rem] text-center shadow-2xl backdrop-blur-xl border border-slate-700/60"
        style={{
          background: 'var(--bg-modal, rgba(15, 23, 42, 0.85))',
          color: 'var(--text-primary, #f8fafc)',
        }}
      >
        <div className="flex justify-center mb-6">
          <IskolarLogo size="lg" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black tracking-wider uppercase mb-4">
          <span>📱 Mobile Platform Exclusive</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3 text-white">
          Student Portal Access
        </h1>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6 text-left space-y-2">
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome, <strong className="text-white">{user?.name || user?.email || 'Student'}</strong>!
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Student access is available exclusively through the ISKOLAR mobile application.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <p className="text-xs text-slate-400">
            Download the ISKOLAR app on your mobile device to browse scholarships, upload documents, track application status, and view interview schedules.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition shadow-lg"
          >
            Log Out Safe
          </button>
        </div>
      </motion.div>
    </div>
  )
}
