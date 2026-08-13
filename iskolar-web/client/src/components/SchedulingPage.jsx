import React, { useState, useEffect } from 'react'

export default function SchedulingPage({ token, user }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form State
  const [type, setType] = useState('exam')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [assignedStudentId, setAssignedStudentId] = useState('')
  const [notes, setNotes] = useState('')

  // Students list to select from
  const [students, setStudents] = useState([])

  const baseUrl = import.meta?.env?.VITE_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetchSchedules()
    fetchStudents()
  }, [])

  async function fetchSchedules() {
    try {
      const res = await fetch(`${baseUrl}/api/schedules`, {
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
      const res = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const body = await res.json()
        // If overview returns student listings, use that, else query /api/users
        setStudents(body.overview?.students || [])
      } else {
        // Fallback query users directly
        const res2 = await fetch(`${baseUrl}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res2.ok) {
          const body2 = await res2.json()
          setStudents(body2.users?.filter(u => u.role === 'student') || [])
        }
      }
    } catch (err) {
      console.warn('Could not fetch students for selection:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Create an exact ISO timestamp combining date and time
    let isoDate = date;
    if (date && time) {
      try {
        const datetimeStr = `${date}T${time}:00`;
        isoDate = new Date(datetimeStr).toISOString();
      } catch (err) {
        console.error('Failed to parse date/time to ISO:', err);
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
      const res = await fetch(`${baseUrl}/api/schedules`, {
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

      // Reset
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
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Exam & Interview Scheduling</h2>
        <p className="text-slate-400 mt-1">Create and manage upcoming examinations and interviews for students.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 1/3: Create Schedule Form */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Create New Schedule</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
              >
                <option value="exam">Exam</option>
                <option value="interview">Interview</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scholarship Entrance Exam"
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Venue / Room (Physical)</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Conference Room A"
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Meeting Link (Virtual)</label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="e.g. https://meet.google.com/..."
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase">Assign Student</label>
              <select
                value={assignedStudentId}
                onChange={(e) => setAssignedStudentId(e.target.value)}
                className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
              >
                <option value="">-- Select a Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary w-full py-3 rounded-xl">
              Save Schedule
            </button>
          </form>
        </div>

        {/* Right 2/3: Schedules List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white">Upcoming Schedules</h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No schedules created yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {schedules.map((s) => (
                <div
                  key={s._id}
                  className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        s.type === 'exam' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-violet-500/10 text-violet-400'
                      }`}>
                        {s.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        s.status === 'scheduled' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white">{s.title}</h4>
                    {s.description && <p className="text-sm text-slate-400">{s.description}</p>}

                    <div className="text-xs text-slate-400 space-y-1">
                      <p>📅 <strong>Date:</strong> {new Date(s.date).toLocaleDateString()} at {s.time}</p>
                      {s.venue && <p>📍 <strong>Venue:</strong> {s.venue}</p>}
                      {s.meetingLink && (
                        <p>
                          💻 <strong>Meeting Link:</strong>{' '}
                          <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                            {s.meetingLink}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right space-y-2">
                    <p className="text-xs text-slate-400 uppercase font-bold">Assigned Students</p>
                    {s.assignedStudents?.length === 0 ? (
                      <span className="text-xs text-slate-500">None assigned</span>
                    ) : (
                      s.assignedStudents.map((st) => (
                        <div key={st.userId} className="text-sm text-white">
                          {st.name || 'Student'}{' '}
                          <span className={`text-xs ${st.confirmed ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                            ({st.confirmed ? 'Confirmed' : 'Pending'})
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
