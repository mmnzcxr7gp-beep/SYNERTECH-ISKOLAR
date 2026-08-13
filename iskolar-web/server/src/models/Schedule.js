const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['EXAM', 'INTERVIEW', 'exam', 'interview'],
      required: true,
    },
    scheduledAt: { type: Date },
    locationOrLink: { type: String },
    title: { type: String, default: 'Assessment Schedule' },
    description: { type: String, default: '' },
    date: { type: Date },
    time: { type: String },
    endTime: { type: String, default: '' },
    venue: { type: String, default: '' },
    meetingLink: { type: String, default: '' },
    scholarshipId: { type: Number, default: null },
    providerId: { type: Number },
    assignedStudents: [
      {
        userId: { type: Number },
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        confirmed: { type: Boolean, default: false },
        confirmedAt: { type: Date, default: null },
      },
    ],
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'SCHEDULED',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
