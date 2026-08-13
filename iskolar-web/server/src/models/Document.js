const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  docType: { type: String, enum: ['BIRTH_CERTIFICATE', 'STUDENT_ID', 'GRADES'], required: true },
  fileUrl: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_RESUBMISSION'], default: 'PENDING' },
  ocrData: { type: Object },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
