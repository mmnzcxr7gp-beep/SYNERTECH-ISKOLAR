/**
 * Search Service — Elasticsearch-Ready Search Abstraction
 * 
 * Default: MongoDB $text search + in-memory regex fallback on db.data
 * Production: swap to Elasticsearch/OpenSearch by setting ELASTICSEARCH_URL
 * 
 * Usage:
 *   const { searchScholarships } = require('./searchService');
 *   const results = await searchScholarships('engineering', { status: 'open' });
 */

const logger = require('./logger');

/**
 * Search scholarships using available search backend.
 * @param {string} query — search text
 * @param {object} [filters={}] — optional filters (status, type, etc.)
 * @returns {Promise<Array>}
 */
const searchScholarships = async (query, filters = {}) => {
  // If Elasticsearch is configured, use it
  if (process.env.ELASTICSEARCH_URL) {
    return elasticSearch('scholarships', query, filters);
  }

  // Try MongoDB text search first
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    try {
      const Scholarship = require('../models/Scholarship');
      const mongoFilter = {};

      if (query) {
        mongoFilter.$text = { $search: query };
      }
      if (filters.status) {
        mongoFilter.status = filters.status;
      }
      if (filters.providerId) {
        mongoFilter.providerId = filters.providerId;
      }

      const results = await Scholarship.find(mongoFilter)
        .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .limit(filters.limit || 50)
        .lean();

      return results;
    } catch (err) {
      logger.debug('MongoDB text search fallback to in-memory', { error: err.message });
    }
  }

  // Fallback: in-memory regex search on db.data
  const { db } = require('../config/db');
  const scholarships = db.data.scholarships || [];

  if (!query) {
    return scholarships.filter((s) => {
      if (filters.status && s.status !== filters.status) return false;
      return true;
    });
  }

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return scholarships.filter((s) => {
    if (filters.status && s.status !== filters.status) return false;
    return regex.test(s.title || '') || regex.test(s.description || '');
  });
};

/**
 * Search applications.
 * @param {string} query
 * @param {object} [filters={}]
 * @returns {Promise<Array>}
 */
const searchApplications = async (query, filters = {}) => {
  const { db } = require('../config/db');
  const applications = db.data.applications || [];

  if (!query && !filters.status && !filters.scholarshipId) {
    return applications;
  }

  return applications.filter((app) => {
    if (filters.status && String(app.status).toLowerCase() !== String(filters.status).toLowerCase()) return false;
    if (filters.scholarshipId && String(app.scholarship_id) !== String(filters.scholarshipId)) return false;
    if (filters.studentId && String(app.student_id) !== String(filters.studentId)) return false;

    if (query) {
      // Search against linked student name
      const student = (db.data.users || []).find((u) => u.id === app.student_id);
      if (student) {
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return regex.test(student.name || '') || regex.test(student.email || '');
      }
      return false;
    }

    return true;
  });
};

/**
 * Elasticsearch adapter stub.
 * @param {string} index
 * @param {string} query
 * @param {object} filters
 */
const elasticSearch = async (index, query, filters) => {
  // Production: Use @elastic/elasticsearch client
  // const { Client } = require('@elastic/elasticsearch');
  // const client = new Client({ node: process.env.ELASTICSEARCH_URL });
  logger.warn('Elasticsearch adapter: install @elastic/elasticsearch for production use');
  // Fallback to in-memory
  if (index === 'scholarships') {
    return searchScholarships(query, { ...filters, _skipElastic: true });
  }
  return [];
};

module.exports = {
  searchScholarships,
  searchApplications,
};
