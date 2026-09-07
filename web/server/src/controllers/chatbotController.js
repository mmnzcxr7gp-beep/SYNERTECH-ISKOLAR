/**
 * ISKOLAR Scholarship Assistant & FAQ Controller
 * 
 * Provides automated, truthful, permission-aware assistance for students.
 * Queries live scholarship opportunities from the database without exposing private applicant data.
 */

const { db } = require('../config/db');

const handleChatbotQuery = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query text is required',
      });
    }

    const q = query.trim().toLowerCase();

    // Query active scholarships
    let activeScholarships = [];
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const { Scholarship } = require('../models');
        if (Scholarship) {
          activeScholarships = await Scholarship.find({
            status: { $in: ['open', 'active', 'published'] },
          }).select('title description deadline totalSlots providerId criteria').lean();
        }
      }
    } catch (_) {}

    if (activeScholarships.length === 0 && db.data?.scholarships) {
      activeScholarships = (db.data.scholarships || []).filter((s) => {
        const status = (s.status || '').toLowerCase();
        return ['open', 'active', 'published'].includes(status);
      });
    }

    let responseText = '';

    if (q.includes('scholarship') || q.includes('available') || q.includes('open') || q.includes('list') || q.includes('find')) {
      if (activeScholarships.length > 0) {
        const topList = activeScholarships.slice(0, 5).map((s, idx) => {
          const deadlineStr = s.deadline ? new Date(s.deadline).toLocaleDateString() : 'Rolling';
          const slots = s.slots || s.totalSlots || 'Available';
          return `${idx + 1}. ${s.title} — Deadline: ${deadlineStr} (${slots} slots)`;
        }).join('\n');
        responseText = `Here are currently active scholarship opportunities on ISKOLAR:\n\n${topList}\n\nYou can browse full details and apply from the Scholarships tab.`;
      } else {
        responseText = 'There are currently no open scholarship programs available for application. Please check back regularly as providers frequently post new programs.';
      }
    } else if (q.includes('gwa') || q.includes('gpa') || q.includes('grade')) {
      responseText = 'GWA/GPA requirements vary by scholarship program. Academic merit scholarships typically require a GWA of 1.75 or higher (or 85%+), while assistance grants may only require passing grades. You can verify the exact criteria in each scholarship details page.';
    } else if (q.includes('document') || q.includes('requirement') || q.includes('cor') || q.includes('cog') || q.includes('id')) {
      responseText = 'Common required documents include:\n1. Certificate of Registration (COR) / Enrollment Form\n2. Transcript of Records / Certificate of Grades (COG)\n3. Valid Student ID\n4. Certificate of Indigency or Income Statement\n\nEnsure scanned documents are clear and in PDF, PNG, or JPEG format before uploading.';
    } else if (q.includes('ocr') || q.includes('scan') || q.includes('checker') || q.includes('verification')) {
      responseText = "ISKOLAR's automated OCR scanner analyzes your uploaded documents to extract grades and student details for your review. You have full control to confirm or correct any extracted details before submitting your application.";
    } else if (q.includes('deadline') || q.includes('date') || q.includes('when')) {
      if (activeScholarships.length > 0) {
        const deadlines = activeScholarships.slice(0, 4).map((s) => {
          const d = s.deadline ? new Date(s.deadline).toLocaleDateString() : 'No deadline specified';
          return `• ${s.title}: ${d}`;
        }).join('\n');
        responseText = `Upcoming application deadlines:\n\n${deadlines}\n\nMake sure to submit all requirements before the closing date.`;
      } else {
        responseText = 'No upcoming scholarship deadlines are currently active.';
      }
    } else if (q.includes('how to apply') || q.includes('apply') || q.includes('steps')) {
      responseText = "Steps to apply:\n1. Go to the Browse tab and choose an open scholarship.\n2. Review the eligibility requirements and criteria.\n3. Complete the application form and upload requested documents.\n4. Confirm the OCR extracted data.\n5. Track your application status in the Application History screen.";
    } else {
      responseText = "Hello! I am ISKOLAR's Scholarship Assistant. I can assist you with:\n• Finding open scholarship opportunities\n• Understanding required documents (COR, COG, ID)\n• Checking GWA and eligibility guidelines\n• Guiding you through the application and OCR confirmation process.\n\nHow can I help you today?";
    }

    return res.json({
      success: true,
      answer: responseText,
      disclaimer: 'Informational assistant based on live platform scholarship data and official guidelines.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { handleChatbotQuery };
