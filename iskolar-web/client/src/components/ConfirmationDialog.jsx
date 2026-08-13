import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ConfirmationDialog({
  open,
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm px-4 py-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-md rounded-3xl border border-slate-800/90 bg-slate-950/95 p-6 shadow-2xl shadow-slate-950/30"
        >
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
