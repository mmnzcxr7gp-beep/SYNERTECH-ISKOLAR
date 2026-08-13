import React, { useState, useEffect } from 'react'

export default function SettingsPage({ token, user, onUpdate }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  
  // Organization form state
  const [orgForm, setOrgForm] = useState({
    organization_name: user?.organization_name || '',
    organization_type: user?.organization_type || 'NGO',
    registration_number: user?.registration_number || '',
    website: user?.website || '',
  })
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    phone: user?.phone || '',
    contact_person: user?.contact_person || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || '',
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    email_applications: true,
    email_approvals: true,
    email_updates: true,
    email_verification: true,
  })

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // For now, we can only update name through the user object
      // Full profile update endpoint needs to be created in backend
      showMessage('Profile update functionality coming soon', 'error')
      return
    } catch (err) {
      showMessage('Network error updating profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOrgUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      showMessage('Organization update functionality coming soon', 'error')
      return
    } catch (err) {
      showMessage('Network error updating organization', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleContactUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      showMessage('Contact update functionality coming soon', 'error')
      return
    } catch (err) {
      showMessage('Network error updating contact information', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showMessage('Passwords do not match', 'error')
      return
    }
    
    if (passwordForm.new_password.length < 8) {
      showMessage('Password must be at least 8 characters', 'error')
      return
    }
    
    setLoading(true)
    try {
      showMessage('Password change functionality coming soon', 'error')
      return
    } catch (err) {
      showMessage('Network error changing password', 'error')
    } finally {
      setLoading(false)
    }
  }

  const messageClass = messageType === 'success'
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'

  return (
    <div className="w-full text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl">
        <div className="px-0 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-slate-400">Manage your profile and preferences</p>
          </div>
        </div>
      </header>

      <div className="p-0">
          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border ${messageClass}`}>
              {message}
            </div>
          )}

          {/* Settings Navigation Tabs */}
          <div className="mb-8 flex gap-2 border-b border-slate-800/60">
            {[
              { id: 'profile', label: 'Profile Information' },
              { id: 'organization', label: 'Organization' },
              { id: 'contact', label: 'Contact Details' },
              { id: 'password', label: 'Password' },
              { id: 'notifications', label: 'Notifications' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-6">Organization Information</h2>
                <form onSubmit={handleOrgUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Organization Name</label>
                    <input
                      type="text"
                      value={orgForm.organization_name}
                      onChange={(e) => setOrgForm({ ...orgForm, organization_name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Your organization name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Organization Type</label>
                    <select
                      value={orgForm.organization_type}
                      onChange={(e) => setOrgForm({ ...orgForm, organization_type: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    >
                      <option value="NGO">NGO</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Government">Government</option>
                      <option value="Educational">Educational Institution</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Registration Number</label>
                    <input
                      type="text"
                      value={orgForm.registration_number}
                      onChange={(e) => setOrgForm({ ...orgForm, registration_number: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Organization registration number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                    <input
                      type="url"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="https://example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Saving...' : 'Save Organization Info'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Contact Details Tab */}
          {activeTab === 'contact' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-6">Contact Details</h2>
                <form onSubmit={handleContactUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Contact Person</label>
                    <input
                      type="text"
                      value={contactForm.contact_person}
                      onChange={(e) => setContactForm({ ...contactForm, contact_person: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                    <input
                      type="text"
                      value={contactForm.address}
                      onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                      <input
                        type="text"
                        value={contactForm.city}
                        onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                      <input
                        type="text"
                        value={contactForm.country}
                        onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Saving...' : 'Save Contact Details'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Enter new password (minimum 8 characters)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { key: 'email_applications', label: 'New Applications', desc: 'Get notified when students apply for your scholarships' },
                    { key: 'email_approvals', label: 'Application Approvals', desc: 'Receive updates on approved/rejected applications' },
                    { key: 'email_updates', label: 'General Updates', desc: 'Receive platform updates and announcements' },
                    { key: 'email_verification', label: 'Verification Status', desc: 'Get notified about your verification status changes' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-start gap-4 p-4 rounded-lg border border-slate-800/60 hover:border-slate-700/60 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[pref.key]}
                        onChange={(e) => setNotifications({ ...notifications, [pref.key]: e.target.checked })}
                        className="mt-1 w-5 h-5 rounded accent-cyan-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-white">{pref.label}</p>
                        <p className="text-sm text-slate-400">{pref.desc}</p>
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={() => showMessage('Notification preferences saved successfully')}
                    className="w-full mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold hover:from-cyan-600 hover:to-sky-600 transition-all"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
