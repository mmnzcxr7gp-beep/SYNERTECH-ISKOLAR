import React from 'react'
import { motion } from 'framer-motion'

const sectionVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: 'easeOut' } },
}

export default function Download() {
  return (
    <motion.section
      id="download"
      className="py-16 md:py-20 relative overflow-hidden"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4 md:px-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-extrabold tracking-wider uppercase">
            <span>📱 Mobile Platform Exclusive</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--text-heading, #ffffff)' }}>
            Student Access via ISKOLAR Mobile
          </h2>

          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary, #D6D0CD)' }}>
            Students access scholarships exclusively through the official ISKOLAR mobile app. Search grants, upload verification documents, complete OCR document reviews, and receive real-time award notifications directly on Android and iOS.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <span className="px-6 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 flex items-center gap-2 cursor-pointer">
              <span>Google Play APK</span>
            </span>
            <span className="px-6 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-2 cursor-pointer">
              <span>App Store (Coming Soon)</span>
            </span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card p-6 md:p-8 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Student App Capabilities</span>
            <span className="text-[11px] text-slate-400 font-semibold">Flutter Android / iOS</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Step-by-Step Scholarship Applications</h4>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Smart forms save progress automatically and guide students through required criteria.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>OCR Document Scanner & Verification</h4>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Built-in Tesseract OCR extracts document fields automatically for student review and correction.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Real-Time Status & Interview Schedules</h4>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Instant Socket.IO notifications keep students informed of reviews, resubmissions, and panel schedules.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
