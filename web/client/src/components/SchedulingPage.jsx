import React, { useState, useEffect } from 'react'
import SpotlightCard from './SpotlightCard'
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UsersIcon,
  ExternalLinkIcon,
  RefreshIcon
} from './Icons'

export default function SchedulingPage({ token, user }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // Form State
  const [type, setType] = useState('interview')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [assignedStudentId, setAssignedStudentId] = useState('')
  const [notes, setNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Students list to select from
  const [students, setStudents] = useState([])

  useEffect(() => {
    fetchSchedules()
    fetchStudents()
  }, [token])

  async function fetchSchedules() {
    setLoading(true)
    try {
      const res = await fetch('/api/schedules', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load schedules')
      const body = await res.json()
      setSchedules(body.schedules || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStudents() {
    try {
      // 1. Primary provider endpoint: fetch candidate applications
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const body = await res.json()
        const apps = body.applications || []
        const studentMap = new Map()

        apps.forEach((app) => {
          const sId = app.student_id
          if (sId && !studentMap.has(String(sId))) {
            studentMap.set(String(sId), {
              id: sId,
              name: app.student_name || `Student #${sId}`,
              email: app.student_email || 'student@iskolar.ph',
              scholarshipTitle: app.scholarship_title || 'Scholarship Program',
              school: app.student_profile?.school || '',
            })
          }
        })

        const candidateList = Array.from(studentMap.values())
        if (candidateList.length > 0) {
          setStudents(candidateList)
          return
        }
      }

      // 2. Admin fallback endpoints
      const res2 = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res2.ok) {
        const body2 = await res2.json()
        setStudents(body2.overview?.students || [])
      } else {
        const res3 = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res3.ok) {
          const body3 = await res3.json()
          setStudents(body3.users?.filter(u => u.role === 'student') || [])
        }
      }
    } catch (err) {
      console.warn('Could not fetch students for selection:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setFormSubmitting(true)

    let isoDate = date
    if (date && time) {
      try {
        const datetimeStr = `${date}T${time}:00`
        isoDate = new Date(datetimeStr).toISOString()
      } catch (err) {
        console.error('Failed to parse date/time to ISO:', err)
      }
    }

    const payload = {
      type,
      title,
      description,
      date: isoDate,
      time,
      endTime,
      venue,
      meetingLink,
      assignedStudents: assignedStudentId ? [Number(assignedStudentId)] : [],
      notes,
    }

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message || 'Failed to create schedule')
      }

      const assignedStudentObj = students.find((s) => String(s.id) === String(assignedStudentId))

      setTitle('')
      setDescription('')
      setDate('')
      setTime('')
      setEndTime('')
      setVenue('')
      setMeetingLink('')
      setAssignedStudentId('')
      setNotes('')

      fetchSchedules()
      alert(`Event "${title}" scheduled successfully! Live notification dispatched to ${assignedStudentObj?.email || 'candidate'}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const totalPages = Math.max(1, Math.ceil(schedules.length / pageSize))
  const paginatedSchedules = schedules.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="pb-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider border mb-2"
            style={{
              backgroundColor: 'rgba(255, 109, 41, 0.10)',
              color: 'var(--primary)',
              borderColor: 'rgba(255, 109, 41, 0.25)'
            }}
          >
            Coordination & Assessment
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Candidate Interview & Examination Agenda
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Coordinate panel interviews, entrance examinations, and orientation sessions with automated student reminders. Timezone: <strong style={{ color: 'var(--text-heading)' }}>Philippine Standard Time (UTC+8)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSchedules}
          className="btn-secondary px-3.5 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Create Schedule Form (4 cols) */}
        <div className="lg:col-span-4 sticky top-20">
          <SpotlightCard className="p-6 space-y-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Schedule Candidate Event</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Event Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="interview">Candidate Panel Interview</option>
                  <option value="exam">Qualifying Examination</option>
                  <option value="orientation">Scholar Orientation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Event Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Stage 2 Candidate Interview"
                  className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Instructions</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for the applicant, presentation requirements, or venue directions..."
                  rows={2}
                  className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Date *</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Time (PHT) *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Venue / Meeting Link</label>
                <input
                  type="text"
                  value={meetingLink || venue}
                  onChange={(e) => {
                    setMeetingLink(e.target.value)
                    setVenue(e.target.value)
                  }}
                  placeholder="https://meet.google.com/xyz or Rm 302 Admin Bldg"
                  className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Assign Candidate</label>
                <select
                  value={assignedStudentId}
                  onChange={(e) => setAssignedStudentId(e.target.value)}
                  className="w-full rounded-xl border p-2.5 text-xs font-medium focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">-- Select Candidate --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={formSubmitting || !title || !date || !time}
                className="btn-primary w-full py-2.5 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {formSubmitting ? 'Scheduling...' : 'Schedule Event'}
              </button>
            </form>
          </SpotlightCard>
        </div>

        {/* Schedules Agenda / List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Upcoming Event Agenda</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Showing {schedules.length} total event(s)</p>
            </div>
            {totalPages > 1 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading schedule items…</div>
          ) : schedules.length === 0 ? (
            <SpotlightCard className="p-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No upcoming exams or interviews currently scheduled.
            </SpotlightCard>
          ) : (
            <div className="space-y-3">
              {paginatedSchedules.map((s) => (
                <SpotlightCard
                  key={s._id || s.id}
                  className="p-5 flex flex-col sm:flex-row justify-between gap-4 sm:items-start"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border"
                        style={{
                          backgroundColor: 'rgba(255, 109, 41, 0.12)',
                          color: 'var(--primary)',
                          borderColor: 'rgba(255, 109, 41, 0.25)'
                        }}
                      >
                        {s.type}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          s.status === 'scheduled'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {s.status || 'scheduled'}
                      </span>
                    </div>

                    <h3 className="text-base font-black" style={{ color: 'var(--text-heading)' }}>{s.title}</h3>
                    {s.description && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>}

                    <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                      <p><strong style={{ color: 'var(--text-heading)' }}>Date & Time:</strong> {new Date(s.date).toLocaleDateString()} at {s.time} (PHT)</p>
                      {s.venue && <p><strong style={{ color: 'var(--text-heading)' }}>Venue:</strong> {s.venue}</p>}
                      {s.meetingLink && (
                        <p className="flex items-center gap-1">
                          <strong style={{ color: 'var(--text-heading)' }}>Meeting Link:</strong>{' '}
                          <a
                            href={s.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-bold text-[#FF6D29] flex items-center gap-1"
                          >
                            <span>{s.meetingLink}</span>
                            <ExternalLinkIcon className="w-3 h-3" />
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Assigned Candidate</p>
                    {s.assignedStudents?.length === 0 ? (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Open Session</span>
                    ) : (
                      s.assignedStudents.map((st, idx) => (
                        <div key={st.userId || idx} className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                          <div>{st.name || 'Student Candidate'}</div>
                          <div className={`text-[10px] font-extrabold ${st.confirmed ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {st.confirmed ? '● Student Acknowledged' : '○ Awaiting Acknowledgment'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SpotlightCard>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, schedules.length)} of {schedules.length} events
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--color-surface-panel)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-[#FF6D29] to-[#FF8552] text-white border-[#FF6D29] shadow-sm'
                        : 'hover:bg-[var(--color-surface-panel)]'
                    }`}
                    style={{
                      backgroundColor: currentPage === pageNum ? 'var(--primary)' : 'var(--color-surface-panel)',
                      borderColor: currentPage === pageNum ? 'var(--primary)' : 'var(--border)',
                      color: currentPage === pageNum ? '#FFFFFF' : 'var(--text-secondary)'
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-[var(--color-surface-panel)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
