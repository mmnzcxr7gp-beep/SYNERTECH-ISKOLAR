import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  CheckCircleIcon,
  ShieldIcon,
  DocumentIcon,
  UsersIcon,
  CalendarIcon,
  AlertTriangleIcon,
  ClockIcon,
  XIcon,
  ExternalLinkIcon
} from './Icons'

export default function NotificationCenter({ token, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const popoverRef = useRef(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const body = await res.json()
        const notifs = body.notifications || []
        setNotifications(notifs)
        setUnreadCount(body.unreadCount ?? notifs.filter((n) => !n.read).length)
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [token])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation()
    try {
      const notifId = notif._id || notif.id
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === notifId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (_) {}
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (_) {}
  }

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif)
    setSelectedNotif(notif)
    setOpen(false)
  }

  const handleNavigateToWorkflow = (route) => {
    if (route) {
      window.location.hash = `#${route}`
      setOpen(false)
      setSelectedNotif(null)
    }
  }

  const getNotificationIcon = (type) => {
    const t = String(type || '').toLowerCase()
    if (t.includes('security') || t.includes('auth') || t.includes('mfa')) {
      return <ShieldIcon className="w-5 h-5 text-emerald-400" />
    }
    if (t.includes('document') || t.includes('ocr')) {
      return <DocumentIcon className="w-5 h-5 text-sky-400" />
    }
    if (t.includes('schedule') || t.includes('interview')) {
      return <CalendarIcon className="w-5 h-5 text-amber-400" />
    }
    if (t.includes('provider') || t.includes('approval') || t.includes('application')) {
      return <UsersIcon className="w-5 h-5 text-[#FF6D29]" />
    }
    return <AlertTriangleIcon className="w-5 h-5 text-indigo-400" />
  }

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Just now'
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          if (!open) fetchNotifications()
        }}
        className="p-2 rounded-xl border relative transition hover:brightness-110 active:scale-95 cursor-pointer"
        style={{
          backgroundColor: 'var(--color-surface-panel, #1E293B)',
          borderColor: 'var(--border, #334155)',
          color: 'var(--text-primary, #FFFFFF)'
        }}
        aria-label="Notifications Center"
        aria-expanded={open}
      >
        <BellIcon className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF6D29] px-1 text-[10px] font-black text-white ring-2 ring-[var(--bg-primary, #0B0F17)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-[100] overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--color-bg-elevated, #131B2A)',
              borderColor: 'var(--border, #334155)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              maxHeight: '80vh'
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 border-b flex items-center justify-between"
              style={{
                backgroundColor: 'var(--color-surface-panel, #1E293B)',
                borderColor: 'var(--border, #334155)'
              }}
            >
              <div className="flex items-center gap-2">
                <BellIcon className="w-4 h-4 text-[#FF6D29]" />
                <span className="text-xs font-bold text-white">
                  Notifications & Alerts
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#FF6D29]/20 text-[#FF6D29] border border-[#FF6D29]/30">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-[#FF6D29] hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto divide-y flex-1 max-h-[380px]" style={{ borderColor: 'var(--border, #334155)' }}>
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  Loading notifications…
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircleIcon className="w-8 h-8 mx-auto text-emerald-400/80" />
                  <p className="text-xs font-bold text-white">
                    All Caught Up
                  </p>
                  <p className="text-[11px] text-slate-400">
                    You have no new notifications or pending review items.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const notifId = notif._id || notif.id
                  const isUnread = !notif.read

                  return (
                    <div
                      key={notifId}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 transition flex gap-3 items-start cursor-pointer hover:bg-white/5 ${
                        isUnread ? 'bg-[#FF6D29]/10' : ''
                      }`}
                    >
                      <div className="mt-0.5 p-2 rounded-xl border bg-black/40 border-white/10 shrink-0">
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                            {notif.title || 'System Notification'}
                          </h4>
                          <span className="text-[10px] shrink-0 font-medium text-slate-400">
                            {formatRelativeTime(notif.createdAt || notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-[11px] line-clamp-2 mt-0.5 leading-relaxed text-slate-300">
                          {notif.message || notif.body || 'Click to view details.'}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                          <span className="text-[10px] font-bold text-[#FF6D29] flex items-center gap-1">
                            <span>Inspect alert</span>
                            <span>→</span>
                          </span>
                          <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">
                            {notif.type || 'SYSTEM'}
                          </span>
                        </div>
                      </div>

                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-[#FF6D29] shrink-0 mt-1.5 ring-2 ring-[#FF6D29]/40" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="p-2.5 border-t text-center"
              style={{
                backgroundColor: 'var(--color-surface-panel, #1E293B)',
                borderColor: 'var(--border, #334155)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  window.location.hash = isAdmin ? '#admin/audit' : '#providers/applicants'
                  setOpen(false)
                }}
                className="text-[11px] font-bold text-slate-300 hover:text-[#FF6D29] transition cursor-pointer"
              >
                {isAdmin ? 'View Full Security Audit Log →' : 'View Applicant Activity →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Detail Inspection Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedNotif && (
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
              }}
              onClick={() => setSelectedNotif(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 text-left my-auto"
                style={{
                  backgroundColor: '#131B2A',
                  borderColor: '#1E293B',
                  color: '#F1F5F9',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
                }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border bg-slate-800 border-slate-700">
                      {getNotificationIcon(selectedNotif.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#FF6D29]/20 text-[#FF6D29] border border-[#FF6D29]/30">
                        {selectedNotif.type || 'SYSTEM ALERT'}
                      </span>
                      <h3 className="text-sm font-black text-white mt-1">
                        {selectedNotif.title || 'Notification Details'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {new Date(selectedNotif.createdAt || selectedNotif.timestamp || Date.now()).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotif(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Message Body */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-xs leading-relaxed text-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Alert Content</div>
                  <p className="text-xs text-white leading-normal">
                    {selectedNotif.message || selectedNotif.body}
                  </p>
                </div>

                {/* Status and Route Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Delivery Status</div>
                    <div className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Delivered & Verified</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Linked Workspace</div>
                    <div className="font-bold text-white mt-0.5 truncate">
                      {selectedNotif.route || 'Global System'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex gap-3 justify-end border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedNotif(null)}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Dismiss
                  </button>

                  {selectedNotif.route && (
                    <button
                      type="button"
                      onClick={() => handleNavigateToWorkflow(selectedNotif.route)}
                      className="px-4 py-2 rounded-xl font-extrabold text-xs bg-[#FF6D29] text-white hover:brightness-110 shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Open Related Page</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
