import React from 'react'
import { motion } from 'framer-motion'

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: 'easeOut' } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: 'easeOut' } },
}

export default function ProviderGuide(){
  return (
    <motion.section id="provider-info" className="py-20 bg-[#0D1E3B]" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={sectionVariants}>
      <div className="container mx-auto px-6">
        <div className="mb-12 max-w-3xl">
          <span className="glow-pill">Provider onboarding</span>
          <h2 className="section-title mt-4 text-[#F4F0E8] text-3xl md:text-4xl font-extrabold leading-tight">
            See how Iskolar supports providers with secure workflows and fast setup.
          </h2>
          <p className="section-subtitle mt-4 text-[#C8D4E6] text-lg leading-relaxed">
            Learn the features, review our security approach, and find the simple steps to become one of our app providers. Email us anytime to start your partnership.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div variants={cardVariants} className="rounded-3xl border border-[#C5A28C]/30 bg-[#132644] p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-[#F4F0E8]">Platform features for providers</h3>
            <div className="mt-6 space-y-5 text-[#C8D4E6]">
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">Verified provider network</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Work with authenticated sponsors and organizations so every scholarship is built on trust.</p>
              </div>
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">Clear applicant tracking</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Monitor submissions, review status, and approve scholarship requests in one easy dashboard.</p>
              </div>
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">Real-time updates</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Stay informed with fast status notifications for applications, verification, and award progress.</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} className="rounded-3xl border border-[#C5A28C]/30 bg-[#132644] p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-[#F4F0E8]">Security and onboarding</h3>
            <div className="mt-6 space-y-5 text-[#C8D4E6]">
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">Secure verification</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Iskolar protects provider data and verifies organizations before they can share awards with students.</p>
              </div>
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">App provider integration</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Join as an app provider and connect your services through our secure platform workflow.</p>
              </div>
              <div>
                <p className="font-bold text-[#F4F0E8] text-base">Start with one email</p>
                <p className="text-[#C8D4E6] text-sm mt-1">Reach out to <a href="mailto:iskolar.official@gmail.com" className="text-[#E5CCB3] underline font-bold">iskolar.official@gmail.com</a> to start provider onboarding.</p>
              </div>
            </div>
            <a href="mailto:iskolar.official@gmail.com?subject=Provider%20Onboarding" className="btn-primary mt-8 inline-flex">Email us to join</a>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
