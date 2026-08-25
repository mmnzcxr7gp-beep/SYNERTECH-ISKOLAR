import React, { useEffect, useState } from 'react'
import ToastMessage from './ToastMessage'
import ConfirmationDialog from './ConfirmationDialog'

const requirementOptions = [
  'Certificate of Enrollment (COE)',
  'Registration Form / Proof of Enrollment',
  'Report Card',
  'Transcript of Records (TOR)',
  'Valid School ID',
  'Recent 2x2 or Passport Photo',
]

const deriveStatusValue = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'open' || normalized === 'draft' || normalized === 'closed') return normalized
  return 'draft'
}

export default function ScholarshipEditPage({ token, scholarshipId, onUpdated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState('')
  const [eligibilityRequirements, setEligibilityRequirements] = useState('')
  const [slots, setSlots] = useState(1)
  const [deadline, setDeadline] = useState('')
  const [programType, setProgramType] = useState('Scholarship')
  const [allowance, setAllowance] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [status, setStatus] = useState('draft')
  const [selectedRequirements, setSelectedRequirements] = useState([])
  const [customRequirement, setCustomRequirement] = useState('')
  const [customRequirements, setCustomRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    async function loadScholarship() {
      setLoading(true)
      setFormMessage('')
      try {
        const res = await fetch(`/api/scholarships/${scholarshipId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setFormMessage(body.message || 'Unable to load scholarship data.')
          return
        }

        const body = await res.json()
        const scholarship = body.scholarship || {}
        const requirements = Array.isArray(body.requirements)
          ? body.requirements
          : []
        const requirementNames = requirements
          .map((req) => {
            if (!req) return ''
            if (typeof req === 'string') return req
            return req.requirementName || req.name || req.name?.toString() || ''
          })
          .filter((req) => Boolean(req))

        setTitle(scholarship.title || '')
        setDescription(scholarship.description || '')
        setSlots(scholarship.totalSlots || scholarship.slots || 1)
        setDeadline(
          scholarship.applicationDeadline
            ? scholarship.applicationDeadline.slice(0, 10)
            : scholarship.deadline
            ? scholarship.deadline.slice(0, 10)
            : ''
        )
        setProgramType(scholarship.type || 'Scholarship')
        setBenefits(scholarship.benefits || '')
        setEligibilityRequirements(scholarship.eligibilityRequirements || '')
        setAllowance(scholarship.allowance ?? '')
        setMaxAmount(scholarship.maxAmount ?? '')
        setStatus(deriveStatusValue(scholarship.status))
        setSelectedRequirements(requirementNames)
        setCustomRequirements([])
      } catch (err) {
        console.error(err)
        setFormMessage('Network error while loading scholarship.')
      } finally {
        setLoading(false)
      }
    }

    if (scholarshipId) {
      loadScholarship()
    }
  }, [scholarshipId, token])

  const allRequirements = [
    ...selectedRequirements,
    ...customRequirements,
    ...(customRequirement.trim() ? [customRequirement.trim()] : []),
  ]

  const handleSave = async (event) => {
    event.preventDefault()
    setFormMessage('')

    if (!title.trim() || !deadline.trim() || !benefits.trim() || !eligibilityRequirements.trim()) {
      setFormMessage('Title, deadline, benefits, and eligibility instructions are required.')
      return
    }

    setPosting(true)
    try {
      const res = await fetch(`/api/scholarships/${scholarshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type: programType,
          benefits: benefits.trim(),
          eligibilityRequirements: eligibilityRequirements.trim(),
          totalSlots: Number(slots) || 1,
          applicationDeadline: deadline,
          allowance: allowance ? parseFloat(allowance) : 0,
          maxAmount: maxAmount ? parseFloat(maxAmount) : 0,
          status: status === 'open' ? 'Open' : status === 'closed' ? 'Closed' : 'Draft',
          requirements: allRequirements
            .map((req) => ({ requirementName: req, isRequired: true }))
            .filter((req) => Boolean(req.requirementName)),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFormMessage(body.message || 'Unable to save scholarship changes.')
        showToast(body.message || 'Unable to save scholarship changes.', 'error')
        return
      }

      setFormMessage('Scholarship updated successfully.')
      showToast('Scholarship updated successfully.', 'success')
      if (typeof onUpdated === 'function') onUpdated()
      window.location.hash = '#providers/scholarships'
    } catch (err) {
      console.error(err)
      setFormMessage('Network error while saving scholarship.')
    } finally {
      setPosting(false)
    }
  }

  const handleClose = () => {
    setConfirmCloseOpen(true)
  }

  const confirmClose = async () => {
    setConfirmCloseOpen(false)
    try {
      const res = await fetch(`/api/scholarships/${scholarshipId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFormMessage(body.message || 'Unable to close scholarship.')
        showToast(body.message || 'Unable to close scholarship.', 'error')
        return
      }
      setFormMessage('Scholarship closed successfully.')
      showToast('Scholarship closed successfully.', 'success')
      if (typeof onUpdated === 'function') onUpdated()
      window.location.hash = '#providers/scholarships'
    } catch (err) {
      console.error(err)
      setFormMessage('Network error while closing scholarship.')
      showToast('Network error while closing scholarship.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        <div>Loading scholarship details…</div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Edit Opportunity
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Update Grant Details
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Change the title, deadline, slots, requirements, or status for this scholarship opportunity.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-xs font-bold cursor-pointer"
            onClick={() => { window.location.hash = '#providers/scholarships' }}
          >
            Back to Scholarships
          </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={posting}
                className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/25 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? 'Closing...' : 'Close Opportunity'}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={handleSave} className="space-y-6">
              <div
                className="rounded-3xl border p-6 space-y-5"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Program Information</h2>
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Program Type</label>
                      <select
                        value={programType}
                        onChange={(e) => setProgramType(e.target.value)}
                        className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="Scholarship">Scholarship</option>
                        <option value="Allowance">Allowance</option>
                        <option value="Scholarship + Allowance">Scholarship + Allowance</option>
                      </select>
                    </div>
                    {(programType === 'Allowance' || programType === 'Scholarship + Allowance') && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Monthly Allowance (₱)</label>
                        <input
                          value={allowance}
                          onChange={(e) => setAllowance(e.target.value)}
                          className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                          style={{
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)'
                          }}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 5000"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      type="text"
                      placeholder="Scholarship name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-field mt-2 min-h-[140px] w-full p-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Describe the scholarship opportunity"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Benefits Summary</label>
                    <textarea
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      className="input-field mt-2 min-h-[100px] w-full p-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="What recipients receive"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Eligibility Instructions</label>
                    <textarea
                      value={eligibilityRequirements}
                      onChange={(e) => setEligibilityRequirements(e.target.value)}
                      className="input-field mt-2 min-h-[100px] w-full p-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Who can apply"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Slots Available</label>
                      <input
                        value={slots}
                        onChange={(e) => setSlots(e.target.value)}
                        className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                        type="number"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Application Deadline</label>
                      <input
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                        type="date"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div
                className="rounded-3xl border p-6 space-y-4"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)'
                }}
              >
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Requirements</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {requirementOptions.map((option) => {
                    const isSelected = selectedRequirements.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedRequirements((current) =>
                            current.includes(option)
                              ? current.filter((item) => item !== option)
                              : [...current, option]
                          )
                        }}
                        className={`rounded-2xl border px-4 py-2.5 text-left text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[#FF6D29] text-white font-bold'
                            : 'hover:border-[#FF6D29]/50'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-primary)'
                        }}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Custom Requirement</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={customRequirement}
                      onChange={(e) => setCustomRequirement(e.target.value)}
                      className="input-field flex-1 p-2.5 text-xs focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      type="text"
                      placeholder="e.g. Community service certificate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = customRequirement.trim()
                        if (!trimmed) return
                        setCustomRequirements((current) =>
                          current.includes(trimmed) ? current : [...current, trimmed]
                        )
                        setCustomRequirement('')
                      }}
                      className="btn-primary px-4 py-2.5 text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...selectedRequirements, ...customRequirements].map((req) => (
                      <span
                        key={req}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {req}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequirements((current) => current.filter((item) => item !== req))
                            setCustomRequirements((current) => current.filter((item) => item !== req))
                          }}
                          className="text-rose-500 hover:text-rose-600 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="rounded-3xl border p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)'
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Save scholarship updates</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Changes will be reflected immediately in the provider dashboard.</p>
                </div>
                <button type="submit" disabled={posting} className="btn-primary px-6 py-2.5 text-xs font-bold">
                  {posting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
              {formMessage ? <div className="text-sm text-rose-400">{formMessage}</div> : null}
            </form>

            <aside className="space-y-6">
              <div
                className="rounded-3xl border p-6"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)'
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Best Practices</p>
                <h2 className="mt-2 text-base font-bold" style={{ color: 'var(--text-heading)' }}>Listing Integrity</h2>
                <ul className="mt-3 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <li>• Keep slots updated to avoid over-subscribing candidate queues.</li>
                  <li>• Define explicit requirements to prevent applicant rejection disputes.</li>
                  <li>• Set realistic deadline schedules for timely document review.</li>
                </ul>
              </div>

              <div
                className="rounded-3xl border p-6"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)'
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Live Preview</p>
                <div
                  className="mt-3 rounded-2xl border p-4"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <h3 className="text-base font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                    {title || 'Scholarship Title Preview'}
                  </h3>
                  <p className="mt-2 text-xs line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                    {description || 'Description preview will update as you edit details.'}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div>Deadline: {deadline || 'TBD'}</div>
                    <div>Slots: {slots || 1}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
      <ConfirmationDialog
        open={confirmCloseOpen}
        title="Close Scholarship"
        message="Are you sure you want to close this scholarship opportunity? This will prevent any new student applications."
        confirmText="Close Opportunity"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
      <ToastMessage toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
