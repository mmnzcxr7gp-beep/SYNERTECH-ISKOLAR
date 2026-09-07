import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE_URL } from '../config/api'

// Mandatory Pre-Registration Privacy Policy Modal Component
function PrivacyPolicyModal({ open, onCancel, onAgree }) {
  const privacyRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onCancel}
      />

      <motion.div
        ref={privacyRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-lg rounded-[2.5rem] p-6 md:p-8 shadow-2xl my-auto border border-slate-700/80 bg-[#161316] text-white flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 id="privacy-policy-title" className="text-xl font-black text-white">Privacy Policy</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Please review and accept our Data Privacy terms before creating an account.</p>
          </div>
          <button
            onClick={onCancel}
            className="text-lg font-bold p-1 transition"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Cancel and close privacy policy"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div
          className="my-4 overflow-y-auto pr-2 space-y-4 text-xs leading-relaxed max-h-[45vh] p-4 rounded-2xl border"
          style={{
            backgroundColor: 'var(--color-surface-panel)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <p className="font-bold text-sm" style={{ color: 'var(--color-text-heading)' }}>SYNERTECH ISKOLAR PRIVACY POLICY</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Effective Date: August 2026</p>

          <div className="space-y-2">
            <h4 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>1. Introduction & Compliance</h4>
            <p>
              SYNERTECH ISKOLAR ("we", "our", or "platform") is committed to safeguarding personal data in full compliance with the Data Privacy Act of 2012 (RA 10173). This policy governs the processing of personal data for users registering through our platform.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">2. Information We Collect</h4>
            <p>
              We collect organization names, legal registration details, authorized representative names, official email addresses, mobile numbers, business locations, and account access credentials required for scholarship provider verification.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">3. Purpose of Processing</h4>
            <p>
              Collected data is processed strictly to: (a) Verify organization authenticity; (b) Enable creation and management of scholarship opportunities; (c) Review student applications; and (d) Deliver essential account notifications and MFA security codes.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">4. Confidentiality & Third-Party Disclosure</h4>
            <p>
              Provider information is made visible strictly to authorized administrators for verification and to student applicants reviewing grant information. Data is never rented or sold to third parties.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">5. Security & Storage</h4>
            <p>
              All account information is transmitted over encrypted HTTPS connections and stored securely in protected database infrastructure. Passwords are hashed using bcrypt with salt rounds.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">6. Declaration of Consent</h4>
            <p>
              By selecting "I Agree and Create Account", you explicitly confirm that you are authorized to represent your organization and consent to the processing of data as described herein.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-white shadow-lg transition hover:brightness-110"
            style={{ background: 'var(--primary, #FF6D29)' }}
          >
            I Agree and Create Account
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LoginModal({ open, onClose, onLoginSuccess, onProviderLogin }) {
  // Focus containment & accessibility refs (SEC-09)
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstInput = modalRef.current.querySelector('input:not([disabled]), button:not([disabled])')
        if (firstInput) firstInput.focus()
      }
    }, 50)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onClose])

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login')
  
  // Selected Role for Login: 'provider' | 'admin' (Default: 'provider')
  const [selectedRole, setSelectedRole] = useState('provider')

  // Sign In Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Provider Registration Fields (Step 1)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('Foundation')
  const [orgTypeOther, setOrgTypeOther] = useState('')
  const [orgRegistrationNumber, setOrgRegistrationNumber] = useState('')
  const [website, setWebsite] = useState('')

  // Address Fields
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Philippines')

  // Representative Fields
  const [representativeName, setRepresentativeName] = useState('')
  const [representativePosition, setRepresentativePosition] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [officePhone, setOfficePhone] = useState('')

  // Security & Consents
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [authorizationDeclared, setAuthorizationDeclared] = useState(true)

  // Pre-Registration Privacy Policy Popup State
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false)

  // Step state for Registration flow: 1 = Form, 2 = Email OTP, 3 = Pending Approval Notice
  const [regStep, setRegStep] = useState(1)
  const [maskedEmail, setMaskedEmail] = useState('')

  // MFA & OTP state
  const [mfaToken, setMfaToken] = useState(null)
  const [otp, setOtp] = useState('')

  // UI status
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error') // 'error' | 'success'
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const baseUrl = API_BASE_URL

  // Resilient multi-target request dispatcher: tries configured baseUrl, same-origin relative proxy, and direct Render backend
  const resilientFetch = async (endpoint, options = {}) => {
    let lastError = null
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

    // 1. Try configured baseUrl
    try {
      const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint
      const res = await fetch(url, options)
      if (res) return res
    } catch (err) {
      lastError = err
    }

    // 2. If baseUrl is not empty, try same-origin relative path (handled by Vercel proxy rewrites)
    if (baseUrl !== '') {
      try {
        const res = await fetch(cleanEndpoint, options)
        if (res) return res
      } catch (err) {
        lastError = err
      }
    }

    // 3. Fallback to direct Render production endpoint
    if (baseUrl !== 'https://iskolar-api.onrender.com') {
      try {
        const res = await fetch(`https://iskolar-api.onrender.com${cleanEndpoint}`, options)
        if (res) return res
      } catch (err) {
        lastError = err
      }
    }

    throw lastError || new Error('Network error: unable to reach backend server')
  }

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' }
    let score = 0
    if (pwd.length >= 12) score += 2
    else if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score >= 5) return { score: 100, label: 'Strong Passphrase', color: 'bg-emerald-500' }
    if (score >= 3) return { score: 65, label: 'Moderate', color: 'bg-amber-500' }
    return { score: 30, label: 'Weak (min 12 chars recommended)', color: 'bg-rose-500' }
  }

  const strength = getPasswordStrength(regPassword)

  // Handle Log In submission
  async function handleLoginSubmit(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    if (!email || !password) {
      setMsg('Please enter your email address and password.')
      setMsgType('error')
      setLoading(false)
      return
    }

    try {
      const res = await resilientFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({ email, password, role: selectedRole }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 403 && body.isPendingApproval) {
          setMsg(body.message || 'Provider account is pending administrator approval.')
          setMsgType('error')
          setLoading(false)
          return
        }
        setMsg(body.message || 'Login failed. Please check your credentials.')
        setMsgType('error')
        setLoading(false)
        return
      }

      if (body.requiresMfa) {
        setMfaToken(body.mfaToken)
        if (body.devOtp) {
          setOtp(body.devOtp)
        }
        setMsg(body.message || 'Please enter the 6-digit verification code sent to your email.')
        setMsgType('success')
        setLoading(false)
        return
      }

      handleLoginSuccess(body)
    } catch (error) {
      console.error('Login error:', error)
      setMsg('Network error. Please check if the backend server is running.')
      setMsgType('error')
      setLoading(false)
    }
  }

  // Step 1: Validate registration form and open Mandatory Privacy Policy Popup
  function handleRegisterFormSubmit(e) {
    e.preventDefault()
    setMsg('')

    if (!orgName || !regEmail || !regPassword || !mobileNumber) {
      setMsg('Please fill in all required organization and representative fields.')
      setMsgType('error')
      return
    }

    if (regPassword.length < 12) {
      setMsg('Password must be at least 12 characters long.')
      setMsgType('error')
      return
    }

    if (regPassword !== confirmPassword) {
      setMsg('Password and Confirm Password do not match.')
      setMsgType('error')
      return
    }

    if (!termsAccepted || !authorizationDeclared) {
      setMsg('You must accept the Terms of Service and Authorization declaration.')
      setMsgType('error')
      return
    }

    // Form is valid -> Open Mandatory Privacy Policy Popup before API call
    setShowPrivacyPopup(true)
  }

  // Step 2: Execute actual API call after user selects "I Agree and Create Account" in Privacy Popup
  async function executeProviderRegistration() {
    setShowPrivacyPopup(false)
    setLoading(true)

    const effectiveOrgType = orgType === 'Other' ? (orgTypeOther || 'Other') : orgType

    try {
      const res = await resilientFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({
          name: orgName,
          email: regEmail,
          password: regPassword,
          role: 'provider',
          orgType: effectiveOrgType,
          orgRegistrationNumber,
          website,
          businessAddress: { addressLine, city, province, postalCode, country },
          representativeName,
          representativePosition,
          mobileNumber,
          officePhone,
          privacyPolicyAccepted: true,
          termsAccepted: true,
          authorizationDeclared: true,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMsg(body.message || body.errors?.[0]?.msg || 'Provider registration failed.')
        setMsgType('error')
        setLoading(false)
        return
      }

      setMaskedEmail(body.email || regEmail)
      setRegStep(2)
      setMsg('Verification code sent to your organization email. Please enter it below.')
      setMsgType('success')
      setLoading(false)
    } catch (error) {
      console.error('Register error:', error)
      setMsg('Network error. Please check if the backend server is running.')
      setMsgType('error')
      setLoading(false)
    }
  }

  // Handle Provider Email OTP Verification
  async function handleVerifyProviderOtp(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    if (!otp) {
      setMsg('Please enter the 6-digit verification code.')
      setMsgType('error')
      setLoading(false)
      return
    }

    try {
      const res = await resilientFetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({ email: regEmail, otp }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMsg(body.message || 'OTP verification failed.')
        setMsgType('error')
        setLoading(false)
        return
      }

      setRegStep(3)
      setMsg('Email verified successfully! Your provider application is now pending administrator review.')
      setMsgType('success')
      setLoading(false)
    } catch (error) {
      console.error('OTP error:', error)
      setMsg('Network error during OTP verification.')
      setMsgType('error')
      setLoading(false)
    }
  }

  // Handle MFA OTP Verification (for Sign In)
  async function handleVerifyOtp(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    if (!otp) {
      setMsg('Please enter the verification code.')
      setMsgType('error')
      setLoading(false)
      return
    }

    try {
      const res = await resilientFetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({ mfaToken, otp }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMsg(body.message || 'OTP Verification failed.')
        setMsgType('error')
        setLoading(false)
        return
      }

      handleLoginSuccess(body)
    } catch (error) {
      console.error('MFA error:', error)
      setMsg('Network error during verification.')
      setMsgType('error')
      setLoading(false)
    }
  }

  async function handleResendMfaOtp() {
    setMsg('')
    setLoading(true)
    try {
      const res = await resilientFetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({ email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(body.message || 'Failed to resend code.')
        setMsgType('error')
        setLoading(false)
        return
      }
      setOtp('')
      setMsg('A new verification code has been sent to your email.')
      setMsgType('success')
    } catch (e) {
      setMsg('Network error while resending verification code.')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  function handleLoginSuccess(body) {
    const role = (body.user?.role || selectedRole || 'provider').toLowerCase()
    const token = body.token
    const userData = { ...body.user, token, role }

    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(userData))

    if (role === 'admin') {
      localStorage.setItem('admin_token', token)
      window.location.hash = '#admin/applicants'
    } else if (role === 'provider' || role === 'sponsor') {
      localStorage.setItem('provider_token', token)
      window.location.hash = '#providers'
    } else {
      localStorage.setItem('student_token', token)
    }

    if (onLoginSuccess) onLoginSuccess(userData)
    if (onProviderLogin && (role === 'provider' || role === 'sponsor')) onProviderLogin(userData)
    onClose()
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 grid place-items-center px-4 py-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="fixed inset-0"
          style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl my-auto border max-h-[90vh] overflow-y-auto"
          style={{
            background: 'var(--bg-modal, #211A18)',
            borderColor: 'var(--border, rgba(255,255,255,0.1))',
            color: 'var(--text-primary, #ffffff)',
          }}
        >
          {/* Close Button */}
          <button
            aria-label="Close modal"
            className="absolute right-6 top-6 text-slate-400 transition hover:text-white text-lg font-bold"
            onClick={onClose}
          >
            ✕
          </button>

          {/* Top Mode Tabs: Sign In vs Register Provider */}
          {!mfaToken && regStep === 1 && (
            <div
              className="flex p-1 rounded-2xl mb-6 border"
              style={{
                backgroundColor: 'var(--color-surface-panel)',
                borderColor: 'var(--color-border)'
              }}
            >
              <button
                type="button"
                onClick={() => { setMode('login'); setMsg(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition ${
                  mode === 'login'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'hover:text-white'
                }`}
                style={{
                  color: mode === 'login' ? '#ffffff' : 'var(--color-text-muted)'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setMsg(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition ${
                  mode === 'register'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'hover:text-white'
                }`}
                style={{
                  color: mode === 'register' ? '#ffffff' : 'var(--color-text-muted)'
                }}
              >
                Register Provider
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 id="login-modal-title" className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-heading, #ffffff)' }}>
                {mfaToken
                  ? 'MFA Verification'
                  : regStep === 2
                  ? 'Verify Email Address'
                  : regStep === 3
                  ? 'Application Under Review'
                  : mode === 'login'
                  ? 'Sign in to the ISKOLAR Management Portal'
                  : 'Register as a Scholarship Provider'}
              </h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary, #D6D0CD)' }}>
                {mfaToken
                  ? 'Enter the 6-digit verification code sent to your registered email.'
                  : regStep === 2
                  ? `Enter the verification code sent to ${maskedEmail || 'your email'}.`
                  : regStep === 3
                  ? 'Your organization registration has been submitted for administrator verification.'
                  : mode === 'login'
                  ? 'Access the provider and administrator workspace.'
                  : 'Create an organization account to offer and manage scholarship programs.'}
              </p>
            </div>

            {/* Account Type Selector for Sign In */}
            {!mfaToken && mode === 'login' && regStep === 1 && (
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary, #D6D0CD)' }}>
                  Select Workspace Role:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('provider')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      selectedRole === 'provider'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-white font-bold'
                        : 'hover:border-[var(--primary)]/50'
                    }`}
                    style={{
                      backgroundColor: selectedRole === 'provider' ? 'rgba(255, 109, 41, 0.10)' : 'var(--color-surface-panel)',
                      borderColor: selectedRole === 'provider' ? 'var(--primary)' : 'var(--color-border)',
                      color: selectedRole === 'provider' ? '#ffffff' : 'var(--color-text-secondary)'
                    }}
                  >
                    <span className="text-[var(--primary)] text-xs font-black">◆</span>
                    <span className="text-xs font-bold">Provider</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      selectedRole === 'admin'
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-white font-bold'
                        : 'hover:border-[var(--primary)]/50'
                    }`}
                    style={{
                      backgroundColor: selectedRole === 'admin' ? 'rgba(255, 109, 41, 0.10)' : 'var(--color-surface-panel)',
                      borderColor: selectedRole === 'admin' ? 'var(--primary)' : 'var(--color-border)',
                      color: selectedRole === 'admin' ? '#ffffff' : 'var(--color-text-secondary)'
                    }}
                  >
                    <span className="text-amber-400 text-xs font-black">◆</span>
                    <span className="text-xs font-bold">Administrator</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form Content */}
            {!mfaToken ? (
              mode === 'login' ? (
                /* LOG IN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={selectedRole === 'admin' ? 'admin@iskolar.ph' : 'provider@organization.ph'}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      style={{
                        background: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] pr-10"
                        style={{
                          background: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {msg && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                      {msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    {loading ? 'Authenticating...' : selectedRole === 'admin' ? 'Sign in as Administrator' : 'Sign in as Provider'}
                  </button>
                </form>
              ) : regStep === 1 ? (
                /* STRUCTURED PROVIDER REGISTRATION FORM (STEP 1) */
                <form onSubmit={handleRegisterFormSubmit} className="space-y-4 pt-1">
                  {/* Section 1: Organization Details */}
                  <div
                    className="space-y-3 p-4 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">1. Organization Details</h4>

                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Legal Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g., Synertech Foundation Inc."
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Organization Type *
                        </label>
                        <select
                          value={orgType}
                          onChange={(e) => setOrgType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                          <option value="Government Agency">Government Agency</option>
                          <option value="Educational Institution">Educational Institution</option>
                          <option value="Foundation">Foundation</option>
                          <option value="Nonprofit Organization">Nonprofit Organization</option>
                          <option value="Private Company">Private Company</option>
                          <option value="Cooperative">Cooperative</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {orgType === 'Other' && (
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Specify Organization Type *
                          </label>
                          <input
                            type="text"
                            required
                            value={orgTypeOther}
                            onChange={(e) => setOrgTypeOther(e.target.value)}
                            placeholder="e.g., International Trust Fund"
                            className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Company / Registration Number
                        </label>
                        <input
                          type="text"
                          value={orgRegistrationNumber}
                          onChange={(e) => setOrgRegistrationNumber(e.target.value)}
                          placeholder="SEC / DTI / BIR No."
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    {/* Business Address */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Complete Business Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        placeholder="Street Address / Building"
                        className="w-full px-3.5 py-2.5 rounded-xl border text-sm mb-2"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City / Muni"
                          className="px-3 py-2 rounded-xl border text-xs"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                        <input
                          type="text"
                          required
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="Province / Region"
                          className="px-3 py-2 rounded-xl border text-xs"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Postal Code"
                          className="px-3 py-2 rounded-xl border text-xs"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Country"
                          className="px-3 py-2 rounded-xl border text-xs"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Authorized Representative */}
                  <div
                    className="space-y-3 p-4 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">2. Authorized Representative</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={representativeName}
                          onChange={(e) => setRepresentativeName(e.target.value)}
                          placeholder="e.g., Maria Santos"
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Position / Designation *
                        </label>
                        <input
                          type="text"
                          required
                          value={representativePosition}
                          onChange={(e) => setRepresentativePosition(e.target.value)}
                          placeholder="e.g., Scholarship Director"
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Organization Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="provider@organization.ph"
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Mobile Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="+63 917 123 4567"
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Password & Security */}
                  <div
                    className="space-y-3 p-4 rounded-2xl border"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">3. Account Password</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Password (Min 12 Chars) *
                        </label>
                        <div className="relative">
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            minLength={12}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl border text-sm pr-10"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showRegPassword}
                            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded"
                          >
                            {showRegPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    {regPassword && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                          <span>Password Strength: {strength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Declarations */}
                    <div className="space-y-2 pt-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="authDeclare"
                          checked={authorizationDeclared}
                          onChange={(e) => setAuthorizationDeclared(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
                        />
                        <label htmlFor="authDeclare" className="leading-tight text-slate-300">
                          I confirm that I am authorized to create and manage this organization's ISKOLAR provider account.
                        </label>
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="termsCheck"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
                        />
                        <label htmlFor="termsCheck" className="leading-tight text-slate-300">
                          I accept the Terms of Service for scholarship providers.
                        </label>
                      </div>
                    </div>
                  </div>

                  {msg && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                      {msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    Create Provider Account
                  </button>
                </form>
              ) : regStep === 2 ? (
                /* OTP VERIFICATION FORM (STEP 2) */
                <form onSubmit={handleVerifyProviderOtp} className="space-y-4 pt-2">
                  <div
                    className="p-4 rounded-2xl border text-center space-y-1"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Verification Code Sent To</span>
                    <div className="font-mono font-bold text-sm text-[var(--primary)]">{maskedEmail}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Enter 6-Digit Email OTP *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3.5 py-3 rounded-xl border text-center tracking-[0.4em] font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {msg && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                      {msg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    {loading ? 'Verifying OTP...' : 'Verify Email & Continue'}
                  </button>
                </form>
              ) : (
                /* PENDING ADMINISTRATOR REVIEW NOTICE (STEP 3) */
                <div className="space-y-5 pt-2 text-center">
                  <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                    <div className="text-2xl">⏳</div>
                    <h4 className="font-bold text-base text-white">Verification Complete — Pending Administrator Approval</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your organization email has been verified. To protect scholarship integrity, new provider accounts require verification by an ISKOLAR Administrator before workspace access is granted.
                    </p>
                  </div>

                  <div
                    className="p-4 rounded-2xl border text-left space-y-2 text-xs"
                    style={{
                      backgroundColor: 'var(--color-surface-panel)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <div className="font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>What happens next?</div>
                    <div>1. An administrator will review your organization details and registration number.</div>
                    <div>2. You will receive an email notification once your provider account is approved.</div>
                    <div>3. Once approved, you can log in to create and manage scholarship grants.</div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                  >
                    Got It — Close Window
                  </button>
                </div>
              )
            ) : (
              /* MFA OTP FORM FOR SIGN IN */
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-center tracking-[0.4em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    style={{
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {msg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                    {msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {loading ? 'Verifying Code...' : 'Verify & Access Workspace'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResendMfaOtp}
                    className="text-xs font-semibold text-[var(--primary)] hover:underline disabled:opacity-50 transition"
                  >
                    Resend Verification Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Mandatory Pre-Registration Privacy Policy Popup */}
      <AnimatePresence>
        {showPrivacyPopup && (
          <PrivacyPolicyModal
            open={showPrivacyPopup}
            onCancel={() => setShowPrivacyPopup(false)}
            onAgree={executeProviderRegistration}
          />
        )}
      </AnimatePresence>
    </>
  )
}
