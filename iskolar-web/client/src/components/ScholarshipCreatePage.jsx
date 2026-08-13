import React, { useState } from 'react'

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
      setFormMessage('⚠️ Title, description, benefits, eligibility instructions, and deadline are required.')
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

      setFormMessage('✨ Scholarship published successfully! Students can now apply.')
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
      setFormMessage('❌ Network error while posting scholarship.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4">
      <div className="rounded-[2.5rem] border border-slate-800/80 bg-slate-950/95 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/20">
              ✦ Provider Portal
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">Post New Scholarship Opportunity</h1>
            <p className="mt-2 text-sm text-slate-400">Fill in program details, benefits, document requirements, and screening steps (exams/interviews).</p>
          </div>
          <button
            type="button"
            onClick={() => { window.location.hash = '#providers' }}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-semibold"
          >
            ← Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleCreate} className="mt-8 space-y-8">
          {/* SECTION 1: PROGRAM INFORMATION */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 grid place-items-center text-cyan-300 font-bold text-sm">
                1
              </div>
              <h2 className="text-xl font-bold text-white">Basic Program Details</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Program Type</label>
                <select
                  value={programType}
                  onChange={(e) => setProgramType(e.target.value)}
                  className="input-field mt-2 w-full bg-slate-950 border-slate-800 text-white rounded-xl p-3 text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Scholarship">Scholarship Grant</option>
                  <option value="Allowance">Financial Assistance / Allowance</option>
                  <option value="Scholarship + Allowance">Full Scholarship + Monthly Allowance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Available Slots</label>
                <input
                  value={slots}
                  onChange={(e) => setSlots(e.target.value)}
                  className="input-field mt-2 w-full bg-slate-950 border-slate-800 text-white rounded-xl p-3 text-sm focus:border-cyan-500 focus:outline-none"
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  required
                />
              </div>
            </div>

            {(programType === 'Allowance' || programType === 'Scholarship + Allowance') && (
              <div className="grid gap-6 sm:grid-cols-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">Monthly Allowance (₱)</label>
                  <input
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    className="input-field mt-2 w-full bg-slate-900 border-slate-700 text-white rounded-xl p-3 text-sm focus:border-emerald-500 focus:outline-none"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 5000"
                  />
                  <p className="mt-1 text-xs text-slate-400">Disbursed directly via student bank / e-wallet.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">Max Grant Amount (₱)</label>
                  <input
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="input-field mt-2 w-full bg-slate-900 border-slate-700 text-white rounded-xl p-3 text-sm focus:border-emerald-500 focus:outline-none"
                    type="number"
                    min="0"
                    placeholder="e.g., 50000"
                  />
                  <p className="mt-1 text-xs text-slate-400">Total maximum financial support per semester/year.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Scholarship Opportunity Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field mt-2 w-full bg-[#172D4F] border-slate-700 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                type="text"
                placeholder="e.g., SM Foundation College Scholarship Program 2026"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Detailed Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field mt-2 min-h-[120px] w-full bg-[#172D4F] border-slate-700 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="Provide complete background info, participating universities, and objectives of the grant..."
                required
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Benefits Summary</label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  className="input-field mt-2 min-h-[100px] w-full bg-[#172D4F] border-slate-700 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="e.g., 100% Tuition & Miscellaneous Fees + ₱5,000 Monthly Allowance + Job Placement"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Eligibility Instructions</label>
                <textarea
                  value={eligibilityRequirements}
                  onChange={(e) => setEligibilityRequirements(e.target.value)}
                  className="input-field mt-2 min-h-[100px] w-full bg-[#172D4F] border-slate-700 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="e.g., Grade 12 Senior High School Graduating Students with GPA 88%+ and Family Income < ₱300,000/yr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Application Deadline</label>
              <input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field mt-2 w-full sm:w-1/2 bg-[#172D4F] border-slate-700 text-[#F4F0E8] rounded-xl p-3 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
                type="date"
                required
              />
            </div>
          </div>

          {/* SECTION 2: ASSESSMENT & SCREENING REQUIREMENTS (EXAM / INTERVIEW) */}
          <div className="rounded-3xl border border-slate-800/80 bg-[#132644] p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="h-8 w-8 rounded-xl bg-violet-500/20 border border-violet-500/30 grid place-items-center text-violet-300 font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Assessment & Screening Process</h2>
                <p className="text-xs text-slate-300">Specify whether applicants need to undergo an Entrance Exam or Panel Interview.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* EXAM OPTION CARD */}
              <div className={`rounded-2xl border p-5 transition-all duration-200 ${hasExam ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg' : 'border-slate-700 bg-[#172D4F]/80 text-slate-300 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="text-base font-bold text-white">Qualifying Examination</h3>
                      <p className="text-xs text-slate-300">Requires written or online test</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasExam}
                      onChange={(e) => setHasExam(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {hasExam && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-cyan-400/30">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300">Exam Mode, Date & Passing Criteria</label>
                    <textarea
                      value={examDetails}
                      onChange={(e) => setExamDetails(e.target.value)}
                      className="input-field w-full bg-[#0D1E3B] border-cyan-400/40 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-xs focus:border-cyan-300 focus:outline-none transition-colors"
                      placeholder="e.g. Online Aptitude & Logic Exam via Portal on April 15, 2026. Passing score: 75%."
                    />
                  </div>
                )}
              </div>

              {/* INTERVIEW OPTION CARD */}
              <div className={`rounded-2xl border p-5 transition-all duration-200 ${hasInterview ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-lg' : 'border-slate-700 bg-[#172D4F]/80 text-slate-300 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎙️</span>
                    <div>
                      <h3 className="text-base font-bold text-white">Panel / Personal Interview</h3>
                      <p className="text-xs text-slate-300">Requires candidate interview</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasInterview}
                      onChange={(e) => setHasInterview(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {hasInterview && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-emerald-400/30">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300">Interview Schedule & Location Notes</label>
                    <textarea
                      value={interviewDetails}
                      onChange={(e) => setInterviewDetails(e.target.value)}
                      className="input-field w-full bg-[#0D1E3B] border-emerald-400/40 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-xs focus:border-emerald-300 focus:outline-none transition-colors"
                      placeholder="e.g. 15-minute Panel Interview via Google Meet for shortlisted applicants. Schedules sent via SMS."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SELECTION STAGES VISUAL FLOW */}
            <div className="bg-[#0D1E3B] p-4 rounded-2xl border border-slate-700">
              <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Generated Selection Pipeline:</span>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selectionStages.map((stage, idx) => (
                  <React.Fragment key={stage}>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#172D4F] border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                      {stage}
                    </span>
                    {idx < selectionStages.length - 1 && <span className="text-cyan-400 font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: DOCUMENT REQUIREMENTS */}
          <div className="rounded-3xl border border-slate-800/80 bg-[#132644] p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="h-8 w-8 rounded-xl bg-sky-500/20 border border-sky-500/30 grid place-items-center text-sky-300 font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Required Documents</h2>
                <p className="text-xs text-slate-300">Select standard documents or add custom requirement fields.</p>
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
                        ? 'border-cyan-400 bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold shadow-md'
                        : 'border-slate-700 bg-[#172D4F] text-slate-200 hover:border-cyan-500/60 hover:text-white'
                    }`}
                  >
                    <span>{option}</span>
                    <span className="font-bold text-sm">{isSelected ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom Requirement Input */}
            <div className="pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Add Custom Document Requirement</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  value={customRequirement}
                  onChange={(e) => setCustomRequirement(e.target.value)}
                  className="input-field flex-1 bg-[#172D4F] border-slate-700 text-[#F4F0E8] placeholder:text-slate-400 rounded-xl p-3 text-xs focus:border-cyan-400 focus:outline-none transition-colors"
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
                  className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-sm"
                >
                  + Add Custom Requirement
                </button>
              </div>

              {/* Requirement Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[...selectedRequirements, ...customRequirements].map((req) => (
                  <span
                    key={req}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D1E3B] border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-200 font-semibold"
                  >
                    {req}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequirements((current) => current.filter((item) => item !== req))
                        setCustomRequirements((current) => current.filter((item) => item !== req))
                      }}
                      className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON & FEEDBACK */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-white">Ready to publish this opportunity live?</p>
              <p className="text-xs text-slate-400">Students using the mobile app will immediately see this listing in their feed.</p>
            </div>
            <button
              type="submit"
              disabled={posting}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? 'Publishing Opportunity…' : '🚀 Publish Scholarship Opportunity'}
            </button>
          </div>

          {formMessage && (
            <div className={`p-4 rounded-2xl text-sm font-semibold border ${formMessage.includes('successfully') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              {formMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
