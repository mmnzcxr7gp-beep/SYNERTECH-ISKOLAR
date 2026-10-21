/**
 * ISKOLAR Document Extraction & Administrative Verification Service
 * (Formerly documentAuthenticityService.js)
 * 
 * Re-exports the updated Document Extraction & Administrative Verification engine
 * to comply with Panel Revision Requirement 2:
 * "Revise 'document authentication' to 'document extraction and administrative verification'
 * throughout the manuscript and system. The process uses OCR extraction followed by
 * administrative review, not independent authentication of document legitimacy."
 */

const extractionService = require('./documentExtractionVerificationService');

module.exports = {
  ...extractionService,
};
