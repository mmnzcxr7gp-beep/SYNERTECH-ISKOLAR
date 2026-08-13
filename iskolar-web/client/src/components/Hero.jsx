import React from 'react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero({ onLogin }) {
  return (
    <section id="home" className="pt-3 pb-10 md:pt-4 md:pb-12 relative" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Live Indicator Chip */}
        <div className="flex items-center justify-center mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderWidth: '1px', color: 'var(--text-primary)' }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold">Iskolar Platform</span>
            <span className="opacity-40">•</span>
            <span className="font-bold text-emerald-600 dark:text-[#E5CCB3]">100% Verified Scholarships</span>
            <span className="opacity-40">•</span>
            <span style={{ color: 'var(--text-muted)' }}>Live API Connected</span>
          </motion.div>
        </div>

        {/* Hero Main Shell */}
        <motion.div
          className="hero-shell glass-frame grid gap-12 lg:grid-cols-[1.4fr_1fr] items-center p-8 md:p-14 transition-colors duration-300"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          {/* Left Column Content */}
          <motion.div className="space-y-6 z-10" variants={containerVariants}>
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest bg-cyan-500/10 text-cyan-700 dark:text-[#E5CCB3] border border-cyan-500/30">
              ✦ Next-Gen Scholarship Platform
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight"
              style={{ color: 'var(--text-heading)' }}
            >
              Empowering Students, <br />
              <span className="text-cyan-600 dark:text-[#C5A28C]">
                Simplifying Scholarships.
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="section-subtitle max-w-xl text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              A unified digital ecosystem connecting Filipino applicants, scholarship providers, and administrators with automated verification, real-time status tracking, and instant notifications.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 pt-4">
              <button onClick={onLogin} className="btn-primary">
                Get Started Now ↗
              </button>
              <a href="#features" className="btn-ghost">
                Explore Features
              </a>
            </motion.div>

            {/* Feature Highlights Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 pt-6">
              <div className="rounded-2xl p-3.5 text-center border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div className="text-lg font-black text-cyan-600 dark:text-[#E5CCB3]">99.8%</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fast Processing</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">Verified</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Trusted Sponsors</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <div className="text-lg font-black text-indigo-600 dark:text-[#C5A28C]">Real-Time</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status Tracking</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column Interactive Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10"
          >
            <div className="rounded-[2.5rem] p-7 border shadow-2xl relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full border bg-cyan-500/10 text-cyan-700 dark:text-[#E5CCB3] border-cyan-500/30">
                  Live Dashboard
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-4 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-[#E5CCB3] mb-1">
                    Automated Ranking Engine
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Smart Merit & Need Scoring
                  </div>
                </div>

                <div className="rounded-2xl p-4 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Document Verification
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      100% Valid
                    </span>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    OCR Grade & Income Checking
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Status: Verified</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready for Awarding</span>
                  </div>
                </div>

                <div className="rounded-2xl p-4 border transition-colors duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-[#E5CCB3] mb-1">
                    Real-Time Notifications
                  </div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Instant Status Updates
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
