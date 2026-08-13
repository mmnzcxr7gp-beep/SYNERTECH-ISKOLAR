import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ToastMessage({ toast, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!toast?.message) return

    const timer = window.setTimeout(() => {
      onClose()
    }, duration)

    return () => window.clearTimeout(timer)
  }, [toast, duration, onClose])

  if (!toast?.message) return null

  const typeStyles = {
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    error: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    info: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-3xl border px-5 py-4 shadow-xl shadow-slate-950/20 backdrop-blur-xl ${typeStyles[toast.type] || typeStyles.info}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
          </div>
          <div className="flex-1 text-sm leading-6 text-white">
            {toast.message}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-slate-100 transition hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
