import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE_URL } from '../config/api'
import IskolarLogo from './IskolarLogo'
import {
  BuildingIcon,
  UsersIcon,
  LockIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckIcon
} from './Icons'

export default function LoginModal({ open, onClose, onLoginSuccess, onProviderLogin }) {
  // Focus containment & accessibility refs
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

  // Selected Role for Login: 'provider' | 'admin'
  const [selectedRole, setSelectedRole] = useState('provider')

  // Sign In Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Multi-Step Registration Flow (Steps 1 through 6)
  // 1. Organization
  // 2. Representative and contact details
  // 3. Account security
  // 4. Consent and review
  // 5. Email verification
  // 6. Approval status
  const [regSubStep, setRegSubStep] = useState(1)

  // Step 1: Organization
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('Foundation')
  const [orgTypeOther, setOrgTypeOther] = useState('')
  const [orgRegistrationNumber, setOrgRegistrationNumber] = useState('')
  const [website, setWebsite] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Philippines')

  // Step 2: Representative & Contacts
  const [representativeName, setRepresentativeName] = useState('')
  const [representativePosition, setRepresentativePosition] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [officePhone, setOfficePhone] = useState('')

  // Step 3: Account Security
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Step 4: Consent & Review
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [authorizationDeclared, setAuthorizationDeclared] = useState(true)

  // Step 5: Email Verification
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')

  // MFA state for Sign In
  const [mfaToken, setMfaToken] = useState(null)
  const [mfaOtp, setMfaOtp] = useState('')

  // UI status
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error') // 'error' | 'success'
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const baseUrl = API_BASE_URL

  const resilientFetch = async (endpoint, options = {}) => {
    let lastError = null
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

    // 1. Configured baseUrl
    try {
      const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint
      const res = await fetch(url, options)
      if (res) return res
    } catch (err) {
      lastError = err
    }

    // 2. Same-origin relative path
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
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-300 dark:bg-slate-700' }
    let score = 0
    if (pwd.length >= 12) score += 2
    else if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score >= 5) return { score: 100, label: 'Strong Passphrase', color: 'bg-emerald-500' }
    if (score >= 3) return { score: 65, label: 'Moderate', color: 'bg-amber-500' }
    return { score: 30, label: 'Weak (min 12 chars required)', color: 'bg-rose-500' }
  }

  const strength = getPasswordStrength(regPassword)

  // -------------------------------------------------------------
  // Sign In Flow
  // -------------------------------------------------------------
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
          setMfaOtp(body.devOtp)
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

  // Handle MFA OTP Verification (for Sign In)
  async function handleVerifyMfaOtp(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    if (!mfaOtp) {
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
        body: JSON.stringify({ mfaToken, otp: mfaOtp }),
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
      setMfaOtp('')
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

  // -------------------------------------------------------------
  // Provider Registration Multi-Step Navigation & Submission
  // -------------------------------------------------------------
  const validateStep1 = () => {
    if (!orgName.trim()) {
      setMsg('Please enter your legal organization name.')
      setMsgType('error')
      return false
    }
    if (!addressLine.trim() || !city.trim() || !province.trim()) {
      setMsg('Please provide a complete organization address (street, city, province).')
      setMsgType('error')
      return false
    }
    setMsg('')
    return true
  }

  const validateStep2 = () => {
    if (!representativeName.trim() || !representativePosition.trim()) {
      setMsg('Please enter the authorized representative name and title.')
      setMsgType('error')
      return false
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setMsg('Please enter a valid official organization email.')
      setMsgType('error')
      return false
    }
    if (!mobileNumber.trim()) {
      setMsg('Please enter a representative contact mobile number.')
      setMsgType('error')
      return false
    }
    setMsg('')
    return true
  }

  const validateStep3 = () => {
    if (regPassword.length < 12) {
      setMsg('Password must be at least 12 characters long.')
      setMsgType('error')
      return false
    }
    if (regPassword !== confirmPassword) {
      setMsg('Password and confirmation do not match.')
      setMsgType('error')
      return false
    }
    setMsg('')
    return true
  }

  // Step 4: Submission
  async function submitProviderRegistration() {
    if (!privacyPolicyAccepted || !termsAccepted || !authorizationDeclared) {
      setMsg('Please accept the required data privacy and authorization declarations.')
      setMsgType('error')
      return
    }

    setLoading(true)
    setMsg('')
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
        setMsg(body.message || body.errors?.[0]?.msg || 'Registration failed.')
        setMsgType('error')
        setLoading(false)
        return
      }

      setMaskedEmail(body.email || regEmail)
      if (body.devOtp || body.devOTP) {
        setOtp(body.devOtp || body.devOTP)
      }
      setRegSubStep(5)
      setMsg('Verification code sent to your official email. Please enter it below.')
      setMsgType('success')
    } catch (error) {
      console.error('Registration error:', error)
      setMsg('Network error. Please check if the backend server is reachable.')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  // Step 5: OTP verification
  async function handleVerifyRegistrationOtp(e) {
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

      setRegSubStep(6)
      setMsg('Email verified successfully! Provider application is under review.')
      setMsgType('success')
    } catch (error) {
      console.error('OTP error:', error)
      setMsg('Network error during OTP verification.')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendRegistrationOtp() {
    setMsg('')
    setLoading(true)
    try {
      const res = await resilientFetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': 'web',
        },
        body: JSON.stringify({ email: regEmail, purpose: 'registration' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(body.message || 'Failed to resend code.')
        setMsgType('error')
        setLoading(false)
        return
      }
      if (body.devOtp || body.devOTP) {
        setOtp(body.devOtp || body.devOTP)
      }
      setMsg('A fresh verification code has been dispatched to your email.')
      setMsgType('success')
    } catch (e) {
      setMsg('Network error while requesting verification code.')
      setMsgType('error')
    } finally {
      setLoading(false)
    }
  }

  const stepsList = [
    { num: 1, label: 'Organization' },
    { num: 2, label: 'Representative' },
    { num: 3, label: 'Security' },
    { num: 4, label: 'Review' },
    { num: 5, label: 'Verification' },
    { num: 6, label: 'Status' },
  ]

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Centered Modal Container */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-xl rounded-2xl p-6 sm:p-8 shadow-2xl my-auto border max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Close Button */}
        <button
          aria-label="Close modal"
          className="absolute right-5 top-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer text-sm font-bold"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Modal Brand Header */}
        <div className="mb-5 flex items-center gap-3">
          <IskolarLogo size="sm" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#305BFE] border px-2 py-0.5 rounded-full" style={{ borderColor: 'var(--border)' }}>
            Authentication Desk
          </span>
        </div>

        {/* Mode Selector Tabs (Sign In vs Register Provider) */}
        {!mfaToken && regSubStep <= 4 && (
          <div
            className="flex p-1 rounded-xl mb-6 border"
            style={{
              backgroundColor: 'var(--color-surface-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('login'); setMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#305BFE] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#305BFE] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-heading)]'
              }`}
            >
              Register Provider
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* MODE: SIGN IN */}
        {/* ----------------------------------------------------------- */}
        {mode === 'login' && !mfaToken && (
          <div className="space-y-4">
            <div>
              <h2 id="login-modal-title" className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
                Sign In to Workspace
              </h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Access the verified scholarship management desk and administrative tools.
              </p>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Select Authorized Role:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole('provider')}
                  className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === 'provider'
                      ? 'border-[#305BFE] bg-[#305BFE]/10 font-bold text-[#305BFE]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#305BFE]/50'
                  }`}
                  style={{ backgroundColor: selectedRole === 'provider' ? 'rgba(48, 91, 254, 0.08)' : 'var(--color-surface-panel)' }}
                >
                  <BuildingIcon className="w-4 h-4 text-[#305BFE]" />
                  <span className="text-xs">Scholarship Provider</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'border-[#305BFE] bg-[#305BFE]/10 font-bold text-[#305BFE]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#305BFE]/50'
                  }`}
                  style={{ backgroundColor: selectedRole === 'admin' ? 'rgba(48, 91, 254, 0.08)' : 'var(--color-surface-panel)' }}
                >
                  <ShieldIcon className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">Administrator</span>
                </button>
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'admin' ? 'admin@iskolar.ph' : 'provider@organization.ph'}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#305BFE]"
                  style={{
                    backgroundColor: 'var(--bg-input, var(--color-surface-panel))',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#305BFE] pr-12"
                    style={{
                      backgroundColor: 'var(--bg-input, var(--color-surface-panel))',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1 py-0.5"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {msg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Authenticating...' : selectedRole === 'admin' ? 'Access Administrator Console' : 'Access Provider Workspace'}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Are you a student applicant? Applications are managed through the mobile application.
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* MFA CODE SCREEN (SIGN IN) */}
        {/* ----------------------------------------------------------- */}
        {mfaToken && (
          <form onSubmit={handleVerifyMfaOtp} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#305BFE]/10 text-[#305BFE] mx-auto flex items-center justify-center">
                <LockIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text-heading)' }}>
                Two-Factor Verification
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Enter the 6-digit security code sent to {email}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-center" style={{ color: 'var(--text-secondary)' }}>
                Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={mfaOtp}
                onChange={(e) => setMfaOtp(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-3 rounded-xl border text-center tracking-[0.4em] font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#305BFE]"
                style={{
                  backgroundColor: 'var(--bg-input, var(--color-surface-panel))',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {msg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Code...' : 'Confirm Identity & Enter Desk'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => { setMfaToken(null); setMfaOtp(''); setMsg(''); }}
                className="text-[var(--text-secondary)] hover:underline cursor-pointer"
              >
                ← Back to Login
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResendMfaOtp}
                className="text-[#305BFE] font-bold hover:underline cursor-pointer"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------- */}
        {/* MODE: REGISTER PROVIDER (6-STEP FLOW) */}
        {/* ----------------------------------------------------------- */}
        {mode === 'register' && !mfaToken && (
          <div className="space-y-4">
            {/* Step Progress Tracker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                <span>Step {regSubStep} of 6</span>
                <span className="text-[#305BFE]">{stepsList[regSubStep - 1]?.label}</span>
              </div>
              <div className="grid grid-cols-6 gap-1 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                {stepsList.map((s) => (
                  <div
                    key={s.num}
                    className={`h-full transition-colors ${
                      s.num <= regSubStep ? 'bg-[#305BFE]' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: ORGANIZATION DETAILS */}
            {regSubStep === 1 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>
                    1. Organization Identity
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Legal registered institution sponsoring or administering scholarships.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Legal Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., SYNERTECH Foundation Inc."
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm"
                    style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Organization Type *
                    </label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Registration / SEC / DTI No.
                    </label>
                    <input
                      type="text"
                      value={orgRegistrationNumber}
                      onChange={(e) => setOrgRegistrationNumber(e.target.value)}
                      placeholder="SEC / DTI / BIR Number"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {orgType === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Specify Organization Type *
                    </label>
                    <input
                      type="text"
                      value={orgTypeOther}
                      onChange={(e) => setOrgTypeOther(e.target.value)}
                      placeholder="e.g., International Development Agency"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Official Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://organization.org"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    Physical Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Street Address / Building Suite"
                    className="w-full px-3.5 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City / Municipality *"
                      className="px-3 py-2 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Province / Region *"
                      className="px-3 py-2 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {msg && (
                  <div className="p-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {msg}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setRegSubStep(2)
                    }}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed: Representative Details</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REPRESENTATIVE & CONTACT DETAILS */}
            {regSubStep === 2 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>
                    2. Authorized Representative
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Contact point authorized to act on behalf of the sponsoring entity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Representative Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="e.g., Maria Santos"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Official Designation / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={representativePosition}
                      onChange={(e) => setRepresentativePosition(e.target.value)}
                      placeholder="e.g., Grants Director"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Official Organization Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="provider@organization.ph"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Verification codes and administrative accreditation updates will be sent to this inbox.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Mobile Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Office Telephone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={officePhone}
                      onChange={(e) => setOfficePhone(e.target.value)}
                      placeholder="(02) 8123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {msg && (
                  <div className="p-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {msg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setMsg(''); setRegSubStep(1); }}
                    className="btn-secondary px-4 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) setRegSubStep(3)
                    }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed: Account Security</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: ACCOUNT SECURITY */}
            {regSubStep === 3 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>
                    3. Account Security Credentials
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Establish access credentials for the provider workspace.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Passphrase (Minimum 12 Characters) *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={12}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border text-xs pr-12"
                        style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1 py-0.5"
                      >
                        {showRegPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Confirm Passphrase *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs"
                      style={{ backgroundColor: 'var(--bg-input, var(--color-surface-panel))', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        <span>Passphrase Strength:</span>
                        <span>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {msg && (
                  <div className="p-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    {msg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setMsg(''); setRegSubStep(2); }}
                    className="btn-secondary px-4 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep3()) setRegSubStep(4)
                    }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed: Consent & Review</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CONSENT & REVIEW */}
            {regSubStep === 4 && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>
                    4. Consent & Dossier Review
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Confirm your registration credentials and accept privacy obligations.
                  </p>
                </div>

                {/* Dossier Summary Box */}
                <div
                  className="p-3.5 rounded-xl border text-xs space-y-2"
                  style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Organization:</span>
                    <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{orgName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                    <span className="font-medium">{orgType === 'Other' ? orgTypeOther : orgType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Authorized Representative:</span>
                    <span className="font-medium">{representativeName} ({representativePosition})</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Official Email:</span>
                    <span className="font-medium text-[#305BFE]">{regEmail}</span>
                  </div>
                </div>

                {/* Statutory Declarations */}
                <div className="space-y-2.5 text-xs pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authorizationDeclared}
                      onChange={(e) => setAuthorizationDeclared(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#305BFE]"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      I declare that I am legally authorized to register and manage scholarship grants for this organization.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyPolicyAccepted}
                      onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#305BFE]"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      I agree to the ISKOLAR Data Privacy terms under Republic Act No. 10173 and consent to institutional accreditation checks.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#305BFE]"
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      I accept the Provider Code of Governance and scholarship management regulations.
                    </span>
                  </label>
                </div>

                {msg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                    {msg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setMsg(''); setRegSubStep(3); }}
                    className="btn-secondary px-4 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={loading || !privacyPolicyAccepted || !termsAccepted || !authorizationDeclared}
                    onClick={submitProviderRegistration}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Submitting Application...' : 'Submit Application & Send Code'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: EMAIL OTP VERIFICATION */}
            {regSubStep === 5 && (
              <form onSubmit={handleVerifyRegistrationOtp} className="space-y-4 animate-fadeIn">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#305BFE]/10 text-[#305BFE] mx-auto flex items-center justify-center">
                    <ShieldIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>
                    5. Verify Official Email
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Enter the 6-digit confirmation code dispatched to: <br />
                    <span className="font-bold text-[#305BFE]">{maskedEmail || regEmail}</span>
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3.5 py-3 rounded-xl border text-center tracking-[0.4em] font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#305BFE]"
                    style={{
                      backgroundColor: 'var(--bg-input, var(--color-surface-panel))',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {msg && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${msgType === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                    {msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#305BFE] hover:bg-[#2748cb] transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Email Address'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResendRegistrationOtp}
                    className="text-xs font-bold text-[#305BFE] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend Verification Code
                  </button>
                </div>
              </form>
            )}

            {/* STEP 6: APPROVAL STATUS (PENDING ACCREDITATION REVIEW) */}
            {regSubStep === 6 && (
              <div className="space-y-4 animate-fadeIn text-center">
                <div className="p-6 rounded-2xl border space-y-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <ClockIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 mb-1.5">
                      Accreditation Pending
                    </span>
                    <h2 className="text-lg font-black text-amber-700 dark:text-amber-300">
                      Application Received — Awaiting Review
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Your organization email has been successfully verified. To ensure scholarship credibility, all provider accounts undergo identity and documentation review by an ISKOLAR administrator before granting grant-publishing access.
                    </p>
                  </div>
                </div>

                {/* Submitted Organization Dossier */}
                <div
                  className="p-4 rounded-xl border text-left space-y-2 text-xs"
                  style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)' }}
                >
                  <div className="font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Submitted Organization Record
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Organization:</span>
                    <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{orgName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Representative:</span>
                    <span className="font-medium">{representativeName} ({representativePosition})</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Verified Email:</span>
                    <span className="font-mono text-[#305BFE]">{regEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">Under Administrative Review</span>
                  </div>
                </div>

                {/* What Happens Next */}
                <div
                  className="p-4 rounded-xl border text-left space-y-1.5 text-xs"
                  style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <div className="font-bold mb-1" style={{ color: 'var(--text-heading)' }}>Accreditation Steps:</div>
                  <div>1. An administrator verifies your organization registration and tax identifier.</div>
                  <div>2. You will receive an official approval email once verification concludes.</div>
                  <div>3. Upon approval, sign in to post and manage scholarship programs.</div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setRegSubStep(1);
                      setMsg('');
                    }}
                    className="btn-secondary flex-1 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary flex-1 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    Acknowledge & Close Desk
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
