import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, BoltIcon, ShieldIcon } from './Icons'

export default function ToastMessage({ toast, message, type, title, onClose, duration = 4000 }) {
  const msg = toast?.message || message
  const toastType = toast?.type || type || 'info'
  const toastTitle = toast?.title || title

  useEffect(() => {
    if (!msg) return

    const timer = window.setTimeout(() => {
      if (typeof onClose === 'function') onClose()
    }, duration)

    return () => window.clearTimeout(timer)
  }, [msg, duration, onClose])

  if (!msg) return null

  const isError = toastType === 'error'
  const isSuccess = toastType === 'success'

  const typeConfig = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100',
      icon: <CheckIcon className="w-5 h-5 text-emerald-400" />,
      title: toastTitle || 'Success',
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/30 text-rose-100',
      icon: <BoltIcon className="w-5 h-5 text-rose-400" />,
      title: toastTitle || 'Error',
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/30 text-amber-100',
      icon: <ShieldIcon className="w-5 h-5 text-amber-400" />,
      title: toastTitle || 'Warning',
    },
    info: {
      bg: 'bg-slate-900/90 border-slate-700 text-slate-100',
      icon: <ShieldIcon className="w-5 h-5 text-[#305BFE]" />,
      title: toastTitle || 'Notice',
    },
  }

  const currentConfig = typeConfig[toastType] || typeConfig.info

  return (
    <AnimatePresence>
      <motion.div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        aria-atomic="true"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-2xl border px-5 py-4 shadow-xl backdrop-blur-md ${currentConfig.bg}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {currentConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            {currentConfig.title && (
              <div className="font-bold text-xs uppercase tracking-wider mb-0.5 opacity-90">
                {currentConfig.title}
              </div>
            )}
            <div className="text-sm leading-relaxed font-medium">
              {msg}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="ml-2 shrink-0 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-100 transition hover:bg-white/20 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
