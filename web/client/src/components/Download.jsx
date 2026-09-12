import React from 'react'
import { motion } from 'framer-motion'
import SpotlightCard from './SpotlightCard'
import ShinyButton from './ShinyButton'
import { PhoneIcon, AndroidIcon, AppleIcon, SearchIcon, BoltIcon, DocumentIcon } from './Icons'

const mobileHighlights = [
  {
    icon: <DocumentIcon className="w-5 h-5 text-[#305BFE]" />,
    title: 'Smart Application Assistant',
    desc: 'Step-by-step guided scholarship applications with auto-saving drafts and deadline reminders.',
  },
  {
    icon: <SearchIcon className="w-5 h-5 text-[#4F96FF]" />,
    title: 'Mobile OCR Document Scanner',
    desc: 'Capture student IDs and report cards directly with camera and review extracted fields before sending.',
  },
  {
    icon: <BoltIcon className="w-5 h-5 text-emerald-500" />,
    title: 'Instant Interview Notifications',
    desc: 'Receive push alerts for shortlisted applications, interview invitations, and grant releases.',
  },
]

export default function Download() {
  return (
    <section id="download" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          
          {/* Left Column: Download Info */}
          <div className="space-y-6">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase border"
              style={{
                backgroundColor: 'rgba(48, 91, 254, 0.10)',
                color: 'var(--primary)',
                borderColor: 'rgba(48, 91, 254, 0.25)'
              }}
            >
              <PhoneIcon className="w-3.5 h-3.5 text-[#305BFE]" />
              <span>Mobile Platform Exclusive</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
              Student Access via <br />
              <span className="gradient-text">ISKOLAR Mobile</span>
            </h2>

            <p className="text-base sm:text-lg leading-relaxed font-normal" style={{ color: 'var(--text-secondary)' }}>
              Students apply and track scholarship grants exclusively through the official ISKOLAR mobile application. Search programs, scan verification documents, and get real-time status updates on Android and iOS.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <a href="/downloads/iskolar-student.apk" download="iskolar-student.apk" className="inline-block">
                <ShinyButton size="lg" icon={<AndroidIcon className="w-4 h-4 text-white" />}>
                  Download Android APK
                </ShinyButton>
              </a>
              <ShinyButton variant="secondary" size="lg" icon={<AppleIcon className="w-4 h-4" />} onClick={() => alert('ISKOLAR iOS TestFlight client registration will open soon for university beta testers.')}>
                iOS TestFlight Beta
              </ShinyButton>
            </div>
          </div>

          {/* Right Column: Capabilities Card */}
          <div>
            <SpotlightCard className="p-7 md:p-8 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#93ABFF]">
                  Student Mobile Capabilities
                </span>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Flutter 3.x
                </span>
              </div>

              <div className="space-y-3.5">
                {mobileHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-xl border space-y-1 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-heading)' }}>
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </div>

        </div>
      </div>
    </section>
  )
}
