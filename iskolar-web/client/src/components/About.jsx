import React from 'react'
import { motion } from 'framer-motion'

const sectionVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: 'easeOut' } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: 'easeOut' } },
}

export default function About() {
  return (
    <motion.section id="about" className="py-12 relative" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={sectionVariants}>
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] items-center">
        <motion.div variants={cardVariants} className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            ❖ PLATFORM BENEFITS & TRUST
          </div>

          <h2 className="text-3xl md:text-5xl font-black leading-tight" style={{ color: 'var(--text-heading)' }}>
            Simplify Scholarship Delivery While Keeping Every Detail Secure
          </h2>

          <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Iskolar turns complex grant distribution into a polished, seamless experience for students, sponsors, and review committees with automated document verification and real-time status updates.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-extrabold text-sm" style={{ color: 'var(--text-heading)' }}>99.8% Faster Awarding</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Automated eligibility scoring</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <div className="font-extrabold text-sm" style={{ color: 'var(--text-heading)' }}>100% Vetted Sponsors</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Verified funding providers</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center gap-3">
              <span className="text-2xl">📲</span>
              <div>
                <div className="font-extrabold text-sm" style={{ color: 'var(--text-heading)' }}>Real-Time SMS & Push</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Instant application alerts</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="font-extrabold text-sm" style={{ color: 'var(--text-heading)' }}>Complete Audit Trails</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Full compliance logs</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="p-8 rounded-3xl border border-[#C5A28C]/30 bg-gradient-to-br from-[#132644] to-[#0D1E3B] text-white shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <h3 className="text-xl font-bold text-[#F4F0E8]">Modern Scholarship Hub</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Live Connected
            </span>
          </div>

          <p className="text-sm text-[#C8D4E6] leading-relaxed">
            Students discover opportunities with confidence, sponsors share verified awards, and review teams manage every applicant in one premium interface.
          </p>

          <div className="space-y-3">
            <div className="rounded-2xl bg-[#0F1F38] p-4 border border-cyan-500/30 flex items-center gap-3 text-xs font-semibold text-cyan-200">
              <span className="text-cyan-400 font-bold text-base">✓</span>
              <span>Rich status tracking keeps review teams aligned and reduces manual inquiries.</span>
            </div>

            <div className="rounded-2xl bg-[#0F1F38] p-4 border border-emerald-500/30 flex items-center gap-3 text-xs font-semibold text-emerald-200">
              <span className="text-emerald-400 font-bold text-base">✓</span>
              <span>Automatic eligibility signals highlight top merit and financial need candidates.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
