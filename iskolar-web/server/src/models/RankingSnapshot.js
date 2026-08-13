const mongoose = require('mongoose');

const RankedApplicantSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScholarshipApplication', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    tieBreakerNote: { type: String, default: '' },
  },
  { _id: false }
);

const RankingSnapshotSchema = new mongoose.Schema(
  {
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    algorithmVersion: {
      type: String,
      default: '1.0',
    },
    rankedApplicants: [RankedApplicantSchema],
    totalEvaluated: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RankingSnapshot', RankingSnapshotSchema);
