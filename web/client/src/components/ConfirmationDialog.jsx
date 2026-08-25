import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ConfirmationDialog({
  open,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const confirmBtnRef = useRef(null)
  const previousActiveElement = useRef(null)

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus()
      }, 50)

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !isProcessing) {
          onCancel?.()
        }

        // Trap focus inside dialog
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), [tabindex="0"]')
          if (focusable.length > 0) {
            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault()
              last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault()
              first.focus()
            }
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('keydown', handleKeyDown)
        if (previousActiveElement.current && previousActiveElement.current.focus) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [open, isProcessing, onCancel])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center backdrop-blur-sm px-4 py-6"
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md rounded-3xl border p-6 shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-modal)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)'
          }}
        >
          <div className="space-y-4">
            <div>
              <h2 id="confirm-dialog-title" className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                {title}
              </h2>
              <p id="confirm-dialog-desc" className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={onCancel}
                className="btn-secondary px-4 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                disabled={isProcessing}
                onClick={onConfirm}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'btn-primary'
                }`}
              >
                {isProcessing ? 'Processing…' : confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
