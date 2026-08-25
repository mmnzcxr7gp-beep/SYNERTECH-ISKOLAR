import React, { useState } from 'react'
import { DocumentIcon, PhoneIcon, SparklesIcon } from './Icons'

const requirementOptions = [
  'Certificate of Enrollment (COE)',
  'Registration Form / Proof of Enrollment',
  'Report Card / Grade Slip',
  'Transcript of Records (TOR)',
  'Valid School ID',
  'Recent 2x2 or Passport Photo',
  'Certificate of Indigency / ITR',
  'Good Moral Certificate',
]

export default function ScholarshipCreatePage({ token, onPublished }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slots, setSlots] = useState(1)
  const [deadline, setDeadline] = useState('')
  const [programType, setProgramType] = useState('Scholarship')
  const [benefits, setBenefits] = useState('')
  const [eligibilityRequirements, setEligibilityRequirements] = useState('')
  const [allowance, setAllowance] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Assessment & Screening Options
  const [hasExam, setHasExam] = useState(false)
  const [examDetails, setExamDetails] = useState('')
  const [hasInterview, setHasInterview] = useState(false)
  const [interviewDetails, setInterviewDetails] = useState('')

  const [selectedRequirements, setSelectedRequirements] = useState([
    'Certificate of Enrollment (COE)',
    'Valid School ID',
  ])
  const [customRequirement, setCustomRequirement] = useState('')
  const [customRequirements, setCustomRequirements] = useState([])
  const [posting, setPosting] = useState(false)
  const [formMessage, setFormMessage] = useState('')

  const allRequirements = [...selectedRequirements, ...customRequirements, ...(customRequirement.trim() ? [customRequirement.trim()] : [])]

  const selectionStages = [
    '1. Document Screening',
    ...(hasExam ? ['2. Qualifying Entrance Exam'] : []),
    ...(hasInterview ? [`${hasExam ? '3' : '2'}. Panel Interview`] : []),
    `${1 + (hasExam ? 1 : 0) + (hasInterview ? 1 : 0) + 1}. Final Awarding`,
  ]

  const handleCreate = async (event) => {
    event.preventDefault()
    setFormMessage('')

    if (!title.trim() || !description.trim() || !benefits.trim() || !eligibilityRequirements.trim() || !deadline.trim()) {
      setFormMessage('Title, description, benefits, eligibility instructions, and deadline are required.')
      return
    }

    setPosting(true)
    try {
      const res = await fetch('/api/scholarships', {
        method: 'POST',
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
          status: 'open',
          hasExam,
          examDetails: hasExam ? examDetails.trim() : '',
          hasInterview,
          interviewDetails: hasInterview ? interviewDetails.trim() : '',
          selectionStages,
          requirements: allRequirements.map((r) => ({ requirementName: r, isRequired: true })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setFormMessage(body.message || 'Unable to publish scholarship')
        return
      }

      setFormMessage('Scholarship published successfully! Students can now apply.')
      setTitle('')
      setDescription('')
      setBenefits('')
      setEligibilityRequirements('')
      setSlots(1)
      setDeadline('')
      setAllowance('')
      setMaxAmount('')
      setHasExam(false)
      setExamDetails('')
      setHasInterview(false)
      setInterviewDetails('')
      setSelectedRequirements(['Certificate of Enrollment (COE)', 'Valid School ID'])
      setCustomRequirement('')
      setCustomRequirements([])

      if (typeof onPublished === 'function') {
        onPublished()
      }
    } catch (err) {
      setFormMessage('Network error while posting scholarship.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Grant Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Post New Scholarship Opportunity
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Fill in program details, benefits, document requirements, and screening steps (exams/interviews).
          </p>
        </div>
        <button
          type="button"
          onClick={() => { window.location.hash = '#providers' }}
          className="btn-secondary self-start sm:self-auto px-4 py-2.5 text-xs font-bold cursor-pointer"
        >
          ← Back to Dashboard
        </button>
      </div>

        <form onSubmit={handleCreate} className="mt-8 space-y-8">
          {/* SECTION 1: PROGRAM INFORMATION */}
          <div
            className="rounded-3xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-xl border grid place-items-center font-bold text-sm"
                style={{
                  backgroundColor: 'rgba(255, 109, 41, 0.15)',
                  borderColor: 'rgba(255, 109, 41, 0.30)',
                  color: 'var(--primary)'
                }}
              >
                1
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Basic Program Details</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Program Type
                </label>
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
                  <option value="Scholarship">Scholarship Grant</option>
                  <option value="Allowance">Financial Assistance / Allowance</option>
                  <option value="Scholarship + Allowance">Full Scholarship + Monthly Allowance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Available Slots
                </label>
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
                  placeholder="e.g. 50"
                  required
                />
              </div>
            </div>

            {(programType === 'Allowance' || programType === 'Scholarship + Allowance') && (
              <div
                className="grid gap-6 sm:grid-cols-2 p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)'
                }}
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Monthly Allowance (₱)
                  </label>
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
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Disbursed directly via student bank / e-wallet.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Max Grant Amount (₱)
                  </label>
                  <input
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="input-field mt-2 w-full p-3 text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    type="number"
                    min="0"
                    placeholder="e.g., 50000"
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Total maximum financial support per semester/year.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Scholarship Opportunity Title
              </label>
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
                placeholder="e.g., SM Foundation College Scholarship Program 2026"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Detailed Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field mt-2 min-h-[120px] w-full p-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Provide complete background info, participating universities, and objectives of the grant..."
                required
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Benefits Summary
                </label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  className="input-field mt-2 min-h-[100px] w-full p-3 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="e.g., Full Tuition & Miscellaneous Fees + ₱5,000 Monthly Allowance + Career Placement"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Eligibility Instructions
                </label>
                <textarea
                  value={eligibilityRequirements}
                  onChange={(e) => setEligibilityRequirements(e.target.value)}
                  className="input-field mt-2 min-h-[100px] w-full p-3 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="e.g., Grade 12 Senior High School Graduating Students with GPA 88%+ and Family Income < ₱300,000/yr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Application Deadline
              </label>
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field mt-2 w-full sm:w-1/2 p-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
                type="date"
                required
              />
            </div>
          </div>

          {/* SECTION 2: ASSESSMENT & SCREENING REQUIREMENTS (EXAM / INTERVIEW) */}
          <div
            className="rounded-3xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div
                className="h-8 w-8 rounded-xl border grid place-items-center font-bold text-sm"
                style={{
                  backgroundColor: 'rgba(255, 109, 41, 0.15)',
                  borderColor: 'rgba(255, 109, 41, 0.30)',
                  color: 'var(--primary)'
                }}
              >
                2
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Assessment & Screening Process</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Specify whether applicants need to undergo an Entrance Exam or Panel Interview.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* EXAM OPTION CARD */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  hasExam
                    ? 'border-[#FF6D29] bg-[#FF6D29]/10 shadow-md'
                    : 'border-[var(--border)] bg-[var(--bg-card)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DocumentIcon className="w-5 h-5 text-[#FF6D29]" />
                    <div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Qualifying Examination</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requires written or online test</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExam}
                      onChange={(e) => setHasExam(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--bg-input)] border border-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6D29]"></div>
                  </label>
                </div>

                {hasExam && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-[#FF6D29]/25">
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                      Exam Mode, Date & Passing Criteria
                    </label>
                    <textarea
                      value={examDetails}
                      onChange={(e) => setExamDetails(e.target.value)}
                      className="input-field w-full p-3 text-xs focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="e.g. Online Aptitude & Logic Exam via Portal on April 15, 2026. Passing score: 75%."
                    />
                  </div>
                )}
              </div>

              {/* INTERVIEW OPTION CARD */}
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  hasInterview
                    ? 'border-[#FF6D29] bg-[#FF6D29]/10 shadow-md'
                    : 'border-[var(--border)] bg-[var(--bg-card)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5 text-[#FF8552]" />
                    <div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Panel / Personal Interview</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requires candidate interview</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasInterview}
                      onChange={(e) => setHasInterview(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--bg-input)] border border-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6D29]"></div>
                  </label>
                </div>

                {hasInterview && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-[#FF6D29]/25">
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                      Interview Schedule & Location Notes
                    </label>
                    <textarea
                      value={interviewDetails}
                      onChange={(e) => setInterviewDetails(e.target.value)}
                      className="input-field w-full p-3 text-xs focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="e.g. 15-minute Panel Interview via Google Meet for shortlisted applicants. Schedules sent via notifications."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SELECTION STAGES VISUAL FLOW */}
            <div
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)'
              }}
            >
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Generated Selection Pipeline:
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selectionStages.map((stage, idx) => (
                  <React.Fragment key={stage}>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {stage}
                    </span>
                    {idx < selectionStages.length - 1 && <span className="font-bold" style={{ color: 'var(--primary)' }}>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: DOCUMENT REQUIREMENTS */}
          <div
            className="rounded-3xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div
                className="h-8 w-8 rounded-xl border grid place-items-center font-bold text-sm"
                style={{
                  backgroundColor: 'rgba(255, 109, 41, 0.15)',
                  borderColor: 'rgba(255, 109, 41, 0.30)',
                  color: 'var(--primary)'
                }}
              >
                3
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Required Documents</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Select standard documents or add custom requirement fields.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                    className={`rounded-2xl border px-4 py-3 text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FF6D29] text-white font-bold shadow-sm'
                        : 'hover:border-[#FF6D29]/50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    <span>{option}</span>
                    <span className="font-bold text-sm">{isSelected ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom Requirement Input */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Add Custom Document Requirement
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  value={customRequirement}
                  onChange={(e) => setCustomRequirement(e.target.value)}
                  className="input-field flex-1 p-3 text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  type="text"
                  placeholder="e.g. Barangay Clearance or Essay Submission"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customRequirement.trim()
                    if (!trimmed) return
                    setCustomRequirements((current) => (current.includes(trimmed) ? current : [...current, trimmed]))
                    setCustomRequirement('')
                  }}
                  className="btn-primary px-5 py-3 text-xs font-bold shadow-sm"
                >
                  + Add Custom Requirement
                </button>
              </div>

              {/* Requirement Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[...selectedRequirements, ...customRequirements].map((req) => (
                  <span
                    key={req}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold"
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

          {/* SUBMIT BUTTON & FEEDBACK */}
          <div
            className="rounded-3xl border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-lg"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Ready to publish this opportunity live?</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Students using the mobile app will immediately see this listing in their feed.</p>
            </div>
            <button
              type="submit"
              disabled={posting}
              className="btn-primary px-8 py-3.5 text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              <SparklesIcon className="w-4 h-4 text-white" />
              <span>{posting ? 'Publishing Opportunity…' : 'Publish Scholarship Opportunity'}</span>
            </button>
          </div>

          {formMessage && (
            <div
              className={`p-4 rounded-2xl text-sm font-semibold border ${
                formMessage.includes('successfully')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}
            >
              {formMessage}
            </div>
          )}
        </form>
    </div>
  )
}
