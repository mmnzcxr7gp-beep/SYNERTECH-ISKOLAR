import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
      document.body.style.overflow = 'hidden'
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
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
        if (previousActiveElement.current && previousActiveElement.current.focus) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [open, isProcessing, onCancel])

  if (!open) return null

  const dialogContent = (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center backdrop-blur-sm px-4 py-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onCancel?.()
        }
      }}
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border p-6 shadow-2xl relative z-[1001]"
        style={{
          backgroundColor: 'var(--color-bg-elevated, #0d121f)',
          borderColor: 'var(--border, #1f293d)',
          color: 'var(--text-primary, #ffffff)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <h2 id="confirm-dialog-title" className="text-xl font-bold" style={{ color: 'var(--text-heading, #ffffff)' }}>
              {title}
            </h2>
            <p id="confirm-dialog-desc" className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary, #94a3b8)' }}>
              {message}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition text-slate-300"
              style={{ borderColor: 'var(--border, #1f293d)' }}
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
                  ? 'bg-[#C33E4D] hover:bg-[#a82d3b]'
                  : 'bg-[#305BFE] hover:bg-[#15265C]'
              }`}
            >
              {isProcessing ? 'Processing…' : confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(dialogContent, document.body) : dialogContent
}
