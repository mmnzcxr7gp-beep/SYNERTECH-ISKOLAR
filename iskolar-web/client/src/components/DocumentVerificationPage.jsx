import React, { useState, useEffect } from 'react'

export default function DocumentVerificationPage({ token }) {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [ocrData, setOcrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('verified')

  const baseUrl = import.meta?.env?.VITE_API_URL || 'http://localhost:4000'

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const res = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load overview data')
      const body = await res.json()

      // The backend db.data.documents structure
      const docs = body.overview?.documents || []
      setDocuments(docs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function runOcr(doc) {
    setOcrLoading(true)
    setOcrData(null)
    setError('')
    setSelectedDoc(doc)

    try {
      const res = await fetch(`${baseUrl}/api/ocr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId: doc.id,
          extractedFields: {
            fullName: doc.extracted_name || doc.student_name || '',
            expirationDate: doc.expiry_date || '',
            dateOfBirth: doc.date_of_birth || doc.dob || '',
            idNumber: doc.id_number || doc.idNumber || '',
          }
        })
      })

      if (!res.ok) throw new Error('OCR verification service error')
      const body = await res.json()
      setOcrData(body)
    } catch (err) {
      setError(err.message)
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleStatusSubmit(e) {
    e.preventDefault()
    if (!selectedDoc) return

    try {
      const res = await fetch(`${baseUrl}/api/ocr/documents/${selectedDoc.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes })
      })

      if (!res.ok) throw new Error('Failed to update status')

      setSelectedDoc(null)
      setOcrData(null)
      setNotes('')
      fetchDocuments()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Document Verification & Authentication</h2>
        <p className="text-slate-400 mt-1">Review uploaded documents, run OCR identity checks, and authenticate profiles.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Side: Documents List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Uploaded Documents Pending Review</h3>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No documents uploaded for verification yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => runOcr(doc)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                    selectedDoc?.id === doc.id
                      ? 'border-cyan-500 bg-cyan-500/5'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Doc #{doc.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      doc.verification_status === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : doc.verification_status === 'rejected'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {doc.verification_status || 'pending'}
                    </span>
                  </div>

                  <h4 className="text-md font-bold text-white mt-1">
                    {doc.document_type || 'Identity Verification Document'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Uploaded by: <strong>{doc.student_name || 'Student'}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Preview & OCR Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">OCR Analysis & Action Panel</h3>

          {selectedDoc ? (
            <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/30 space-y-6">
              {/* Document Image Frame */}
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative grid place-items-center">
                {selectedDoc.file_path ? (
                  <img
                    src={`${baseUrl}${selectedDoc.file_path}`}
                    alt="Uploaded Document"
                    className="object-contain h-full w-full"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-xs text-slate-500">Document preview unavailable</span>
                )}
              </div>

              {/* OCR Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-md">Automated OCR Data Check</h4>

                {ocrLoading ? (
                  <div className="p-4 text-center text-slate-400">Running Tesseract.js data matching...</div>
                ) : ocrData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Match Status:</span>
                      <span className={`font-bold uppercase ${
                        ocrData.status === 'PASSED' || ocrData.status === 'consistent' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {ocrData.status.replace('_', ' ')}
                      </span>
                    </div>

                    {ocrData.mismatches?.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                        ⚠️ <strong>Mismatch ({m.field}):</strong> Profile is "{m.profile}" but OCR extracted "{m.document}".
                      </div>
                    ))}

                    {ocrData.flags?.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
                        🚨 <strong>Flagged:</strong> {f.replace(/_/g, ' ')}
                      </div>
                    ))}

                    {ocrData.warnings?.map((w, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
                        ⚠️ {w.message}
                      </div>
                    ))}

                    {ocrData.matches?.length > 0 && ocrData.mismatches?.length === 0 && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300">
                        ✓ Matching fields checked successfully.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                    Select a document to run AI OCR verification.
                  </div>
                )}
              </div>

              {/* Admin decision form */}
              <form onSubmit={handleStatusSubmit} className="space-y-4 pt-4 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Verification Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  >
                    <option value="verified">Approve & Authenticate</option>
                    <option value="rejected">Reject Document</option>
                    <option value="needs_resubmission">Request Resubmission</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase">Review Notes / Corrections</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter reason for rejection or approval remarks..."
                    className="mt-2 w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-white h-20 resize-none"
                    required={status !== 'verified'}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 rounded-xl">
                  Submit Verification Decision
                </button>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              Select a document from the list to begin verification.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
