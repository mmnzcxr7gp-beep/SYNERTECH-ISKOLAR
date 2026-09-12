import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVerticalIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  HistoryIcon,
  DocumentIcon,
  GraduationCapIcon,
  BuildingIcon,
  LockIcon,
  XIcon
} from './Icons'

// Global event bus for single-menu enforcement
const OPEN_MENU_EVENT = 'iskolar:open-account-menu'

/**
 * AccountActionsMenu - Accessible, compact, portaled three-dot context menu for Student & Provider account administration
 */
export default function AccountActionsMenu({
  account = {},
  onViewAccount,
  onTriggerAction,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, flipAbove: false })
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const menuIdRef = useRef(`menu-${account.id || Math.random().toString(36).substr(2, 9)}`)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])

  const displayName = account.displayName || account.name || account.email || `Account #${account.id || ''}`
  const status = String(account.accountStatus || (account.isDeleted ? 'DELETION_PENDING' : account.isSuspended ? 'SUSPENDED' : 'ACTIVE')).toUpperCase()
  const isPending = status.includes('PENDING') || (!account.isVerified && !account.sponsor_verified && status !== 'SUSPENDED' && status !== 'DELETION_PENDING' && status !== 'ARCHIVED' && status !== 'DELETED')
  const isSuspended = status === 'SUSPENDED' || !!account.isSuspended
  const isArchived = status === 'ARCHIVED'
  const isDeletionPending = status === 'DELETION_PENDING' || (account.isDeleted && status !== 'DELETED')
  const isActive = status === 'ACTIVE' && !isSuspended && !isArchived && !isDeletionPending

  // Assemble list of available contextual actions based on exact account status
  const standardActions = []
  const destructiveActions = []

  // 1. Primary View & Inspection Actions
  standardActions.push({
    id: 'view_account',
    label: 'View Account',
    icon: <ShieldIcon className="w-3.5 h-3.5 text-[#305BFE]" />,
    handler: () => onViewAccount && onViewAccount(account, 'overview')
  })

  standardActions.push({
    id: 'view_docs',
    label: 'View Verification Documents',
    icon: <DocumentIcon className="w-3.5 h-3.5 text-blue-400" />,
    handler: () => onViewAccount && onViewAccount(account, 'documents')
  })

  standardActions.push({
    id: 'view_submissions',
    label: account.role === 'provider' ? 'View Managed Scholarships' : 'View Applications',
    icon: account.role === 'provider' ? <BuildingIcon className="w-3.5 h-3.5 text-indigo-400" /> : <GraduationCapIcon className="w-3.5 h-3.5 text-indigo-400" />,
    handler: () => onViewAccount && onViewAccount(account, 'submissions')
  })

  // 2. Status-Specific Lifecycle Actions
  if (isPending) {
    standardActions.push({
      id: 'verify_account',
      label: 'Verify Account',
      variant: 'success',
      icon: <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'verify')
    })
    standardActions.push({
      id: 'request_info',
      label: 'Request More Information',
      icon: <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'info')
    })
    destructiveActions.push({
      id: 'reject_account',
      label: 'Reject Account',
      variant: 'danger',
      icon: <XIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'reject')
    })
  }

  if (isActive) {
    standardActions.push({
      id: 'edit_account',
      label: 'Edit Account',
      icon: <DocumentIcon className="w-3.5 h-3.5 text-amber-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'edit')
    })
    standardActions.push({
      id: 'suspend_account',
      label: 'Suspend Account',
      variant: 'warning',
      icon: <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'suspend')
    })
    standardActions.push({
      id: 'archive_account',
      label: 'Archive Account',
      icon: <HistoryIcon className="w-3.5 h-3.5 text-slate-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'archive')
    })
    destructiveActions.push({
      id: 'request_deletion',
      label: 'Request Deletion',
      variant: 'danger',
      icon: <XIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'soft-delete')
    })
  }

  if (isSuspended) {
    standardActions.push({
      id: 'view_suspension_reason',
      label: 'View Suspension Reason',
      icon: <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onViewAccount && onViewAccount(account, 'overview')
    })
    standardActions.push({
      id: 'reactivate_account',
      label: 'Reactivate Account',
      variant: 'success',
      icon: <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'reactivate')
    })
    standardActions.push({
      id: 'archive_account',
      label: 'Archive Account',
      icon: <HistoryIcon className="w-3.5 h-3.5 text-slate-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'archive')
    })
    destructiveActions.push({
      id: 'request_deletion',
      label: 'Request Deletion',
      variant: 'danger',
      icon: <XIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'soft-delete')
    })
  }

  if (isArchived) {
    standardActions.push({
      id: 'restore_account',
      label: 'Restore Account',
      variant: 'success',
      icon: <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'restore')
    })
    standardActions.push({
      id: 'view_retained_records',
      label: 'View Retained Records',
      icon: <HistoryIcon className="w-3.5 h-3.5 text-slate-400" />,
      handler: () => onViewAccount && onViewAccount(account, 'submissions')
    })
    destructiveActions.push({
      id: 'permanent_delete',
      label: 'Request Permanent Deletion',
      variant: 'danger',
      icon: <XIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'permanent-delete')
    })
  }

  if (isDeletionPending) {
    standardActions.push({
      id: 'view_deletion_impact',
      label: 'View Deletion Impact',
      icon: <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'permanent-delete')
    })
    standardActions.push({
      id: 'cancel_deletion',
      label: 'Cancel Deletion (Restore)',
      variant: 'success',
      icon: <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'restore')
    })
    destructiveActions.push({
      id: 'permanently_delete_eligible',
      label: 'Permanently Delete Eligible Data',
      variant: 'danger',
      icon: <XIcon className="w-3.5 h-3.5 text-rose-400" />,
      handler: () => onTriggerAction && onTriggerAction(account, 'permanent-delete')
    })
  }

  // 3. Security Actions
  standardActions.push({
    id: 'view_history',
    label: 'View Account History',
    icon: <HistoryIcon className="w-3.5 h-3.5 text-purple-400" />,
    handler: () => onViewAccount && onViewAccount(account, 'history')
  })

  standardActions.push({
    id: 'revoke_sessions',
    label: 'Revoke Sessions',
    icon: <LockIcon className="w-3.5 h-3.5 text-amber-400" />,
    handler: () => onTriggerAction && onTriggerAction(account, 'revoke-sessions')
  })

  const allActions = [...standardActions, ...destructiveActions]

  // Calculate coordinates relative to trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 260
    const estimatedHeight = 320

    // Check horizontal bounds
    let left = rect.right - menuWidth
    if (left < 12) left = 12
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12
    }

    // Check vertical space (flip above if near bottom)
    const spaceBelow = window.innerHeight - rect.bottom
    const flipAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight

    const top = flipAbove ? rect.top - 6 : rect.bottom + 6

    setMenuCoords({ top, left, flipAbove })
  }, [])

  // Listen for other menus opening to enforce single-open-menu rule
  useEffect(() => {
    const handleGlobalOpen = (e) => {
      if (e.detail?.id !== menuIdRef.current) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    window.addEventListener(OPEN_MENU_EVENT, handleGlobalOpen)
    return () => window.removeEventListener(OPEN_MENU_EVENT, handleGlobalOpen)
  }, [])

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('touchstart', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        openMenu()
        setFocusedIndex(0)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
      setFocusedIndex(-1)
      if (triggerRef.current) triggerRef.current.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((prev) => (prev + 1) % allActions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((prev) => (prev - 1 + allActions.length) % allActions.length)
    } else if (e.key === 'Tab') {
      setIsOpen(false)
      setFocusedIndex(-1)
    }
  }

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].focus()
    }
  }, [isOpen, focusedIndex])

  const openMenu = () => {
    updatePosition()
    setIsOpen(true)
    setFocusedIndex(-1)
    window.dispatchEvent(new CustomEvent(OPEN_MENU_EVENT, { detail: { id: menuIdRef.current } }))
  }

  const handleActionClick = (e, action) => {
    e.stopPropagation()
    setIsOpen(false)
    setFocusedIndex(-1)
    if (action.handler) {
      action.handler()
    }
    if (triggerRef.current) {
      triggerRef.current.focus()
    }
  }

  const renderDropdown = () => {
    if (!isOpen) return null

    const menuContent = (
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Actions for ${displayName}`}
        className="fixed z-[1001] w-64 rounded-2xl border shadow-2xl overflow-hidden py-1.5 focus:outline-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        style={{
          top: menuCoords.flipAbove ? undefined : `${menuCoords.top}px`,
          bottom: menuCoords.flipAbove ? `${window.innerHeight - menuCoords.top}px` : undefined,
          left: `${menuCoords.left}px`,
          backgroundColor: 'var(--color-bg-elevated, #0f172a)',
          borderColor: 'var(--border, rgba(255, 255, 255, 0.15))',
          color: 'var(--text-primary, #ffffff)',
          boxShadow: '0 20px 35px -5px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
        }}
      >
        {/* Standard Action Group */}
        <div className="space-y-0.5 px-1">
          {standardActions.map((action, idx) => (
            <button
              key={action.id}
              ref={(el) => (itemRefs.current[idx] = el)}
              role="menuitem"
              tabIndex={focusedIndex === idx ? 0 : -1}
              onClick={(e) => handleActionClick(e, action)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleActionClick(e, action)
                } else {
                  handleKeyDown(e)
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${
                action.variant === 'success'
                  ? 'text-emerald-400 hover:bg-emerald-500/15 focus:bg-emerald-500/15'
                  : action.variant === 'warning'
                  ? 'text-amber-400 hover:bg-amber-500/15 focus:bg-amber-500/15'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white'
              }`}
            >
              <span className="shrink-0">{action.icon}</span>
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Separated Destructive Actions Section */}
        {destructiveActions.length > 0 && (
          <div className="mt-1 pt-1 border-t px-1 space-y-0.5" style={{ borderColor: 'var(--border, rgba(255, 255, 255, 0.1))' }}>
            {destructiveActions.map((action, idx) => {
              const actualIdx = standardActions.length + idx
              return (
                <button
                  key={action.id}
                  ref={(el) => (itemRefs.current[actualIdx] = el)}
                  role="menuitem"
                  tabIndex={focusedIndex === actualIdx ? 0 : -1}
                  onClick={(e) => handleActionClick(e, action)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleActionClick(e, action)
                    } else {
                      handleKeyDown(e)
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-left transition cursor-pointer text-rose-400 hover:bg-rose-500/15 focus:bg-rose-500/15"
                >
                  <span className="shrink-0">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )

    return typeof document !== 'undefined' ? createPortal(menuContent, document.body) : menuContent
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Three-Dot Action Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (isOpen) {
            setIsOpen(false)
            setFocusedIndex(-1)
          } else {
            openMenu()
          }
        }}
        onKeyDown={handleKeyDown}
        aria-label={`Open actions for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="p-1.5 rounded-lg border transition cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#305BFE] active:scale-95"
        style={{
          backgroundColor: isOpen ? 'rgba(48, 91, 254, 0.15)' : 'var(--color-surface-panel, rgba(30, 41, 59, 0.6))',
          borderColor: isOpen ? 'var(--primary, #305BFE)' : 'var(--border, rgba(255, 255, 255, 0.1))'
        }}
      >
        <MoreVerticalIcon className="w-4 h-4" />
      </button>

      {/* Portaled Floating Action Menu */}
      {renderDropdown()}
    </div>
  )
}
