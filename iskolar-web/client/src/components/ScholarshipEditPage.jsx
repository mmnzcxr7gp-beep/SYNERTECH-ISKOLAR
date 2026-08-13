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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div>Loading scholarship details…</div>
      </div>
    )
  }

  return (
    <div className="w-full py-6">
      <div className="w-full">
        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/95 p-8 shadow-[0_35px_90px_-40px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Edit scholarship</p>
              <h1 className="mt-3 text-4xl font-bold text-white">Update your opportunity</h1>
              <p className="mt-4 max-w-2xl text-slate-400">Change the title, deadline, slots, requirements, or status for this scholarship.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" className="btn-ghost" onClick={() => { window.location.hash = '#providers/scholarships' }}>
                Back to scholarships
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={posting}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? 'Closing...' : 'Close scholarship'}
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={handleSave} className="space-y-8">
              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold text-white">Scholarship / Allowance details</h2>
                <div className="mt-6 grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Program type</label>
                      <select
                        value={programType}
                        onChange={(e) => setProgramType(e.target.value)}
                        className="input-field mt-2 w-full"
                      >
                        <option value="Scholarship">Scholarship</option>
                        <option value="Allowance">Allowance</option>
                        <option value="Scholarship + Allowance">Scholarship + Allowance</option>
                      </select>
                    </div>
                    {(programType === 'Allowance' || programType === 'Scholarship + Allowance') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300">Monthly Allowance (₱)</label>
                        <input
                          value={allowance}
                          onChange={(e) => setAllowance(e.target.value)}
                          className="input-field mt-2 w-full"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 5000"
                        />
                        <p className="mt-2 text-xs text-slate-400">
                          Students will receive the allowance through the bank or e-wallet they provide.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field mt-2 w-full" type="text" placeholder="Scholarship name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field mt-2 min-h-[160px] w-full" placeholder="Describe the scholarship opportunity" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Benefits summary</label>
                    <textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} className="input-field mt-2 min-h-[120px] w-full" placeholder="What recipients receive or how support is delivered" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Eligibility instructions</label>
                    <textarea value={eligibilityRequirements} onChange={(e) => setEligibilityRequirements(e.target.value)} className="input-field mt-2 min-h-[120px] w-full" placeholder="Who can apply and what documents are needed" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Slots available</label>
                      <input value={slots} onChange={(e) => setSlots(e.target.value)} className="input-field mt-2 w-full" type="number" min="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Application deadline</label>
                      <input value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-field mt-2 w-full" type="date" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="input-field mt-2 w-full"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold text-white">Requirements</h2>
                <p className="mt-3 text-slate-400">Select predefined requirements or add custom items for this scholarship.</p>
                <div className="mt-6 grid gap-3">
                  {requirementOptions.map((option) => (
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
                      className={
                        'rounded-3xl border px-4 py-3 text-left text-sm transition ' +
                        (selectedRequirements.includes(option)
                          ? 'border-cyan-400 bg-cyan-500/10 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-900/95')
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-300">Custom requirement</label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={customRequirement}
                      onChange={(e) => setCustomRequirement(e.target.value)}
                      className="input-field w-full"
                      type="text"
                      placeholder="e.g. Community service hours"
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
                      className="btn-primary w-full sm:w-auto"
                    >
                      Add requirement
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...selectedRequirements, ...customRequirements].map((req) => (
                      <button
                        key={req}
                        type="button"
                        onClick={() => {
                          setSelectedRequirements((current) => current.filter((item) => item !== req))
                          setCustomRequirements((current) => current.filter((item) => item !== req))
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                      >
                        {req}
                        <span className="text-slate-400">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-slate-300">Save your scholarship updates.</p>
                  <p className="mt-1 text-sm text-slate-500">Changes will be reflected immediately in the provider dashboard.</p>
                </div>
                <button type="submit" disabled={posting} className="btn-primary">
                  {posting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
              {formMessage ? <div className="text-slate-300">{formMessage}</div> : null}
            </form>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/95 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Best practices</p>
                <h2 className="mt-3 text-lg font-semibold text-white">Keep your listing up to date</h2>
                <ul className="mt-4 space-y-3 text-slate-400">
                  <li>• Check deadlines and slots before publication.</li>
                  <li>• Add clear requirements to reduce incomplete applications.</li>
                  <li>• Close expired listings to keep the live feed relevant.</li>
                </ul>
              </div>
              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/95 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Draft preview</p>
                <div className="mt-5 rounded-3xl border border-slate-800/60 bg-slate-950/90 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Scholarship</p>
                  <h3 className="mt-3 text-xl font-semibold text-white truncate">{title || 'Scholarship title goes here'}</h3>
                  <p className="mt-3 text-slate-400 line-clamp-3">{description || 'Description preview will update as you edit your scholarship details.'}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-slate-400">
                    <div>Deadline: {deadline || 'TBD'}</div>
                    <div>Slots: {slots || 1}</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <ConfirmationDialog
        open={confirmCloseOpen}
        title="Close scholarship"
        message="Close this scholarship? This will stop new applications."
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={confirmClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
      <ToastMessage toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
