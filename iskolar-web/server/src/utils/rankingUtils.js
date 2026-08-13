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

  const gpaScore = normalize(p.gpa, 4.0) * weights.gpa;
  const needScore = normalize(p.family_income > 0 ? 4.0 - Math.min(p.family_income / 50000, 4.0) : 1, 4.0) * weights.financialNeed;
  const achievementScore = Math.min((p.achievements || '').split(',').filter(Boolean).length / 5, 1) * weights.achievements;
  const otherScore = Math.min((p.course?.length || 0) > 0 ? 1 : 0, 1) * weights.other;

  return Number((gpaScore + needScore + achievementScore + otherScore).toFixed(2));
};

module.exports = {
  calculateRankingScore,
};
