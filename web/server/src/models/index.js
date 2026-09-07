const User = require('./User');
const Document = require('./Document');
const Schedule = require('./Schedule');
const Student = require('./Student');
const Provider = require('./Provider');
const Verification = require('./Verification');
const Transaction = require('./Transaction');
const School = require('./School');
const ScholarshipOpportunity = require('./ScholarshipOpportunity');
const Scholarship = require('./Scholarship');
const ScholarshipRequirement = require('./ScholarshipRequirement');
const ScholarshipApplication = require('./ScholarshipApplication');
const ApplicationDocument = require('./ApplicationDocument');
const AutomaticCheckResult = require('./AutomaticCheckResult');
const OcrExtraction = require('./OcrExtraction');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const ManualReviewLog = require('./ManualReviewLog');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Otp = require('./Otp');
const RevokedToken = require('./RevokedToken');

module.exports = {
  User,
  Document,
  Schedule,
  Student,
  Provider,
  Verification,
  Transaction,
  School,
  ScholarshipOpportunity,
  Scholarship,
  ScholarshipRequirement,
  ScholarshipApplication,
  ApplicationDocument,
  AutomaticCheckResult,
  OcrExtraction,
  AuditLog,
  Notification,
  ManualReviewLog,
  Conversation,
  Message,
  Otp,
  RevokedToken,
};

