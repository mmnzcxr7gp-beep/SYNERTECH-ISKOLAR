const ROLES = Object.freeze({
  STUDENT: 'student',
  SPONSOR: 'sponsor',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  ADMINISTRATOR: 'administrator',
});

const CANONICAL_ROLES = Object.freeze({
  STUDENT: 'student',
  SPONSOR: 'sponsor',
  ADMIN: 'admin',
});

function normalizeRole(role) {
  if (!role) return 'student';
  const norm = String(role).trim().toLowerCase();
  if (norm === 'provider' || norm === 'sponsor' || norm === 'scholarship_provider') return 'sponsor';
  if (norm === 'admin' || norm === 'administrator') return 'admin';
  if (norm === 'student' || norm === 'applicant') return 'student';
  return norm;
}

function isStudent(role) {
  return normalizeRole(role) === 'student';
}

function isSponsor(role) {
  return normalizeRole(role) === 'sponsor';
}

function isAdmin(role) {
  return normalizeRole(role) === 'admin';
}

module.exports = {
  ROLES,
  CANONICAL_ROLES,
  normalizeRole,
  isStudent,
  isSponsor,
  isAdmin,
};
