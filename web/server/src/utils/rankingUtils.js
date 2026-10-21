/**
 * Normalizes academic grade into a 0.0 - 1.0 factor based on scale.
 * - Philippine Scale (1.0 highest, 5.0 failing): (5.0 - grade) / 4.0
 * - Percentage Scale (> 5.0, e.g. 75 - 100): (grade - 50) / 50
 * - US 4.0 Scale (when explicitly configured): grade / 4.0
 */
const normalizeGpa = (value, scale = 'PH_1.0_5.0') => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return 0;

  if (scale === 'US_4.0' || scale === '4.0') {
    return Math.min(Math.max(value / 4.0, 0), 1);
  }

  // Philippine 1.0 - 5.0 scale (standard in CHED / Philippine universities)
  if (value <= 5.0) {
    return Math.min(Math.max((5.0 - value) / 4.0, 0), 1);
  }

  // Percentage scale (75% - 100%)
  return Math.min(Math.max((value - 50) / 50, 0), 1);
};

const normalize = (value, max = 4.0) => {
  if (typeof value !== 'number' || value <= 0) return 0;
  return Math.min(value / max, 1);
};

const calculateRankingScore = (criteria = {}, profile = {}) => {
  const p = profile || {};
  const weights = {
    gpa: criteria.gpa ?? 40,
    financialNeed: criteria.financialNeed ?? 30,
    achievements: criteria.achievements ?? 20,
    other: criteria.other ?? 10,
  };

  const rawGpa = Number(p.gpa ?? p.gwa ?? 0);
  const gradeScale = criteria.gradeScale || criteria.gradingScale || 'PH_1.0_5.0';
  const gpaScore = normalizeGpa(rawGpa, gradeScale) * weights.gpa;
  const needScore = normalize(p.family_income > 0 ? 4.0 - Math.min(p.family_income / 50000, 4.0) : 1, 4.0) * weights.financialNeed;
  const achievementScore = Math.min((p.achievements || '').split(',').filter(Boolean).length / 5, 1) * weights.achievements;
  const otherScore = Math.min((p.course?.length || 0) > 0 ? 1 : 0, 1) * weights.other;

  return Number((gpaScore + needScore + achievementScore + otherScore).toFixed(2));
};

module.exports = {
  calculateRankingScore,
  normalizeGpa,
};
