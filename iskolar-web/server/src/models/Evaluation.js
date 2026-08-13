const mongoose = require('mongoose');

const CriterionScoreSchema = new mongoose.Schema(
  {
    criterionName: { type: String, required: true },
    weightPercentage: { type: Number, required: true },
    rawScore: { type: Number, required: true },
    weightedScore: { type: Number, required: true },
  },
  { _id: false }
);

const EvaluationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScholarshipApplication',
      required: true,
      index: true,
    },
    scholarshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    criterionScores: [CriterionScoreSchema],
    weightedTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    remarks: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Evaluation', EvaluationSchema);
