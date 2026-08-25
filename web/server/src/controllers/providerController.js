const mongoose = require('mongoose');
const { db } = require('../config/db');
const { Provider } = require('../models');
const { isOwnedBy } = require('../utils/ownership');

const formatMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getProviderDashboard = async (req, res, next) => {
  try {
    console.log('[getProviderDashboard] Starting - req.user:', req.user);
    const userId = Number(req.user.id);
    console.log('[getProviderDashboard] User ID (converted to number):', userId, 'type:', typeof userId);
    
    const scholarships = db.data.scholarships.filter((scholarship) => isOwnedBy(scholarship, userId));
    console.log('[getProviderDashboard] Found', scholarships.length, 'scholarships for user', userId);
    
    const scholarshipIds = scholarships.map((scholarship) => scholarship.id);
    const applications = db.data.applications.filter((application) =>
      scholarshipIds.includes(application.scholarship_id)
    );
    console.log('[getProviderDashboard] Found', applications.length, 'applications for scholarships');

    const totalScholarships = scholarships.length;
    const activeScholarships = scholarships.filter((scholarship) => scholarship.status === 'open').length;
    const closedScholarships = scholarships.filter((scholarship) => scholarship.status === 'closed').length;
    const totalApplicants = new Set(applications.map((application) => application.student_id)).size;

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      ranked: 0,
      other: 0,
    };
    applications.forEach((application) => {
      const status = application.status || 'other';
      if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
        statusCounts[status] += 1;
      } else {
        statusCounts.other += 1;
      }
    });

    const decisionCount = statusCounts.approved + statusCounts.rejected;
    const approvalRate = decisionCount > 0 ? Math.round((statusCounts.approved / decisionCount) * 100) : 0;

    const averageApplicationAgeDays = applications.length > 0
      ? Math.round(
          applications.reduce((sum, application) => {
            const appliedAt = new Date(application.applied_at);
            const ageDays = Number.isNaN(appliedAt.getTime())
              ? 0
              : (Date.now() - appliedAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + ageDays;
          }, 0) / applications.length
        )
      : 0;

    const topPrograms = scholarships
      .map((scholarship) => {
        const scholarshipApplications = applications.filter(
          (application) => application.scholarship_id === scholarship.id
        );
        const approvedCount = scholarshipApplications.filter((a) => a.status === 'approved').length;
        return {
          id: scholarship.id,
          title: scholarship.title || 'Untitled program',
          status: scholarship.status || 'open',
          applicants: scholarshipApplications.length,
          approved: approvedCount,
          pending: scholarshipApplications.filter((a) => a.status === 'pending').length,
          created_at: scholarship.created_at || null,
        };
      })
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 3);

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return {
        label: date.toLocaleString('default', { month: 'short' }),
        key: formatMonthKey(date),
        count: 0,
      };
    });

    const monthCounts = Object.fromEntries(months.map((month) => [month.key, month]));
    applications.forEach((application) => {
      const appliedAt = new Date(application.applied_at);
      if (Number.isNaN(appliedAt.getTime())) return;
      const monthKey = formatMonthKey(appliedAt);
      if (monthCounts[monthKey]) {
        monthCounts[monthKey].count += 1;
      }
    });

    const monthlyApplications = months.map((month) => ({ label: month.label, count: month.count }));

    let funding = {
      totalFundingAmount: 0,
      totalDisbursedAmount: 0,
      remainingAllocation: 0,
    };

    try {
      if (mongoose.connection.readyState === 1) {
        const provider = await Provider.findOne({ userId }).lean();
        if (provider) {
          const totalFundingAmount = provider.totalFundingAmount || 0;
          const totalDisbursedAmount = provider.totalDisbursedAmount || 0;
          funding = {
            totalFundingAmount,
            totalDisbursedAmount,
            remainingAllocation: Math.max(totalFundingAmount - totalDisbursedAmount, 0),
          };
        }
      }
    } catch (error) {
      // If Mongo is unavailable or provider profile does not exist, keep zero values.
    }

    return res.json({
      dashboard: {
        totalScholarships,
        activeScholarships,
        closedScholarships,
        totalApplicants,
        approvalRate,
        averageApplicationAgeDays,
        applicationStatusCounts: statusCounts,
        topPrograms,
        monthlyApplications,
        funding,
      },
    });
  } catch (error) {
    console.error('[getProviderDashboard] Error:', error?.message || error);
    console.error('[getProviderDashboard] Full error:', error);
    next(error);
  }
};

module.exports = {
  getProviderDashboard,
};

