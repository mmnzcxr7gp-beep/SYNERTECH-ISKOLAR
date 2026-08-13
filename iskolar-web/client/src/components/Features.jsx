import React from 'react'
import { motion } from 'framer-motion'

const featuresData = [
  {
    icon: '✦',
    tag: 'INTELLIGENT MATCHING',
    title: 'Automated Opportunity Matching',
    description: 'Students get personalized scholarship suggestions based on course, GPA, family income, and verified eligibility requirements.',
    color: 'from-cyan-500/20 to-sky-500/10',
    borderColor: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  {
    icon: '❖',
    tag: 'ORGANIZATION PROOF',
    title: 'Verified Sponsor Network',
    description: 'Every scholarship provider is vetted by administrators before posting, establishing complete transparency and student trust.',
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    icon: '◈',
    tag: 'AUTO SCORING',
    title: 'Rankings & Applicant Scoring',
    description: 'Smart algorithms compute weighted merit and financial need scores, giving review teams objective decision data instantly.',
    color: 'from-indigo-500/20 to-purple-500/10',
    borderColor: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    icon: '☍',
    tag: 'SOCKET.IO REAL-TIME',
    title: 'Live Application Tracking',
    description: 'Instant notification triggers keep applicants and providers aligned through every status change, interview schedule, and award.',
    color: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function Features() {
  return (
    <section id="features" className="py-20 relative">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-xs font-bold text-cyan-300 border border-cyan-500/20">
            ✦ PLATFORM CAPABILITIES
          </div>
          <h2 className="section-title text-3xl md:text-5xl font-black">
            Designed for Clarity, Built for Impact
          </h2>
          <p className="section-subtitle">
            Say goodbye to paper trails and manual spreadsheets. Iskolar streamlines every phase of scholarship management in one secure cloud workspace.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {featuresData.map((item) => (
            <motion.div
              key={item.title}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`glass-card rounded-[2rem] p-8 relative overflow-hidden border ${item.borderColor} bg-gradient-to-br ${item.color}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`h-12 w-12 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-xl font-bold ${item.iconColor} shadow-md`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                  {item.tag}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white mb-3" style={{ color: 'var(--text-heading)' }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
