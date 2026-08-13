const getScholarshipOwnerId = (scholarship) => {
  if (!scholarship) return null;
  // Support both sponsor_id and provider_id fields and normalize types
  const candidate = scholarship.sponsor_id ?? scholarship.provider_id ?? null;
  return candidate === null || candidate === undefined ? null : Number(candidate);
};

const isOwnedBy = (scholarship, userId) => {
  const ownerId = getScholarshipOwnerId(scholarship);
  if (ownerId === null) return false;
  return Number(userId) === ownerId;
};

module.exports = { getScholarshipOwnerId, isOwnedBy };
