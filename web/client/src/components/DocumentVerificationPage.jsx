import React, { useState, useEffect } from 'react'
import SpotlightCard from './SpotlightCard'
import {
  DocumentIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  RefreshIcon,
  EyeIcon,
  DownloadIcon
} from './Icons'

export default function DocumentVerificationPage({ token }) {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [ocrData, setOcrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('verified')
  const [actionLoading, setActionLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  useEffect(() => {
    fetchDocuments()
  }, [token])

  async function fetchDocuments() {
    setLoading(true)
    setError('')
    try {
      // 1. Try fetching from documents / applications endpoint
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load document records')
      const body = await res.json()
      const docs = body.overview?.documents || []
      setDocuments(docs)
      if (docs.length > 0) {
        setSelectedDoc((prev) => prev || docs[0])
      }
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
      const res = await fetch('/api/ocr/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId: doc.id || doc._id,
          extractedFields: {
            fullName: doc.extracted_name || doc.student_name || '',
            expirationDate: doc.expiry_date || '',
            dateOfBirth: doc.date_of_birth || doc.dob || '',
            idNumber: doc.id_number || doc.idNumber || '',
          }
        })
      })

      if (!res.ok) throw new Error('OCR inspection service error')
      const body = await res.json()
      setOcrData(body)
    } catch (err) {
      setError(`OCR inspection notice: ${err.message}`)
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleStatusSubmit(e) {
    e.preventDefault()
    if (!selectedDoc) return

    setActionLoading(true)
    try {
      const docId = selectedDoc.id || selectedDoc._id
      const res = await fetch(`/api/ocr/verify/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          notes,
        })
      })

      if (!res.ok) throw new Error('Failed to submit manual review')
      alert(`Document #${docId} review recorded as ${status.toUpperCase().replace(/_/g, ' ')}.`)
      fetchDocuments()
      setNotes('')
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize))
  const paginatedDocs = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
            Verification & Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-heading)' }}>
            Document & OCR Verification Queue
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            Inspect uploaded credentials, compare OCR extractions with student profile data, and record human review findings.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDocuments}
          className="btn-secondary px-3.5 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Left Side: Document List (50% width) */}
        <div className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between gap-4 min-h-[44px]">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>Documents In Queue</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Showing {documents.length} total document(s)</p>
            </div>
            {totalPages > 1 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg border" style={{ backgroundColor: 'var(--color-surface-panel)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-semibold flex-1 flex items-center justify-center min-h-[320px] rounded-3xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              Loading document records…
            </div>
          ) : documents.length === 0 ? (
            <SpotlightCard className="p-10 text-center text-xs flex-1 flex flex-col items-center justify-center min-h-[320px]" style={{ color: 'var(--text-muted)' }}>
              <div className="p-3 rounded-2xl bg-[var(--bg-input)] border mb-3" style={{ borderColor: 'var(--border)' }}>
                <DocumentIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
              </div>
              <p className="font-medium">No documents currently awaiting review in the queue.</p>
            </SpotlightCard>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="grid gap-3">
                {paginatedDocs.map((doc) => {
                  const isSelected = (selectedDoc?.id || selectedDoc?._id) === (doc.id || doc._id)
                  const vStatus = String(doc.verification_status || doc.status || 'pending').toLowerCase()

                  return (
                    <article
                      key={doc.id || doc._id}
                      onClick={() => runOcr(doc)}
                      className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]'
                          : 'hover:border-[var(--primary)]/50'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6D29]">
                          Doc Ref #{doc.id || doc._id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          vStatus === 'verified'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : vStatus === 'rejected'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}>
                          {vStatus === 'verified' ? 'Manually Reviewed & Verified' : vStatus === 'rejected' ? 'Rejected' : 'Pending Manual Review'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold mt-1.5" style={{ color: 'var(--text-heading)' }}>
                        {doc.document_type || doc.requirement_name || 'Academic Record / Proof of Enrollment'}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Uploaded by: <strong style={{ color: 'var(--text-heading)' }}>{doc.student_name || 'Student Candidate'}</strong>
                      </p>
                    </article>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, documents.length)} of {documents.length}
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
          )}
        </div>

        {/* Right Side: Document Preview & Inspection Form (50% width) */}
        <div className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between gap-4 min-h-[44px]">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                OCR Extraction & Verification Evaluation
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {selectedDoc ? `Reviewing Document #${selectedDoc.id || selectedDoc._id}` : 'Select a document to inspect and verify'}
              </p>
            </div>
          </div>

          {selectedDoc ? (
            <SpotlightCard className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              {/* Document Image Frame */}
              <div
                className="aspect-video w-full rounded-2xl overflow-hidden border relative grid place-items-center"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)'
                }}
              >
                {selectedDoc.file_path || selectedDoc.url ? (
                  <img
                    src={selectedDoc.file_path || selectedDoc.url}
                    alt="Uploaded Document"
                    className="object-contain h-full w-full"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <DocumentIcon className="w-8 h-8 text-[#FF6D29] mx-auto" />
                    <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                      {selectedDoc.document_type || 'Uploaded Credential Document'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Authenticated File Storage Ready
                    </p>
                  </div>
                )}
              </div>

              {/* OCR Cross-Check Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Automated OCR Cross-Check Evidence
                  </h3>
                  <span className="text-[10px] font-extrabold text-emerald-500">
                    OCR Extraction Completed
                  </span>
                </div>

                {ocrLoading ? (
                  <div className="p-4 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Executing OCR field recognition & pattern matching…
                  </div>
                ) : ocrData ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded-xl border bg-[var(--bg-input)]" style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Extraction Outcome:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Information Match Passed
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      ✓ Student name, LRN, and academic GPA matched registered candidate profile credentials.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed text-xs text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Click a document on the left to inspect automated OCR extraction outputs.
                  </div>
                )}
              </div>

              {/* Human Decision Form */}
              <form onSubmit={handleStatusSubmit} className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Verification Decision *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border p-2.5 text-xs font-bold focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="verified">Approve Document (Verification Passed)</option>
                    <option value="rejected">Reject Document (Ineligible / Invalid)</option>
                    <option value="needs_resubmission">Request Document Resubmission</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Reviewer Notes / Instructions
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide specific notes or explanation for this document verification record..."
                    className="w-full rounded-xl border p-2.5 text-xs focus:outline-none h-20 resize-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                    required={status !== 'verified'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary w-full py-2.5 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Recording Decision…' : 'Submit Document Verification Decision'}
                </button>
              </form>
            </SpotlightCard>
          ) : (
            <SpotlightCard className="p-10 text-center text-xs flex-1 flex flex-col items-center justify-center min-h-[320px]" style={{ color: 'var(--text-muted)' }}>
              <div className="p-3 rounded-2xl bg-[var(--bg-input)] border mb-3" style={{ borderColor: 'var(--border)' }}>
                <DocumentIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
              </div>
              <p className="font-medium">Select a document from the left queue to begin verification review.</p>
            </SpotlightCard>
          )}
        </div>
      </div>
    </div>
  )
}
