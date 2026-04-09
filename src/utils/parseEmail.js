// ============================================================
// Email Parser — extracts branch + year from @uecu.ac.in email
// ============================================================

const BRANCH_MAP = {
  cs:  'Computer Science',
  ee:  'Electrical Engineering',
  me:  'Mechanical Engineering',
  ce:  'Civil Engineering',
  ec:  'Electronics & Communication',
  it:  'Information Technology',
  ch:  'Chemical Engineering',
  pi:  'Production & Industrial Engg',
  eee: 'Electrical & Electronics',
  mca: 'MCA',
  mba: 'MBA',
};

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th'];

/**
 * Parse a @uecu.ac.in roll number email.
 * Roll number format: <digits><branchcode><2-digit-year><digits>
 * Example: 0701ee241007 → branch=ee, admYear=2024
 *
 * @param {string} email
 * @returns {{ rollNumber, branchCode, branch, admissionYear, currentYear, yearLabel } | null}
 */
export function parseUECEmail(email) {
  if (!email || !email.endsWith('@uecu.ac.in')) return null;

  const roll = email.split('@')[0].toLowerCase();

  // Match: optional leading digits, branch letters, 2-digit year, trailing digits
  const match = roll.match(/^(\d*)([a-z]{2,3})(\d{2})(\d+)$/);
  if (!match) return null;

  const [, , branchCode, yearShort, ] = match;
  const branchName    = BRANCH_MAP[branchCode] || branchCode.toUpperCase();
  const admissionYear = 2000 + parseInt(yearShort, 10);

  // Indian academic year starts in July.
  // Jan–June belongs to the academic year that started the PREVIOUS calendar year.
  // e.g. April 2026 → academic year 2025-26 → academicStart = 2025
  //      August 2026 → academic year 2026-27 → academicStart = 2026
  const now              = new Date();
  const academicStart    = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const academicYear     = Math.min(Math.max(academicStart - admissionYear + 1, 1), 4);
  const yearLabel        = ORDINAL[academicYear] ? `${ORDINAL[academicYear]} Year` : `${academicYear}th Year`;

  return {
    rollNumber:    roll,
    branchCode,
    branch:        branchName,
    admissionYear,
    currentYear:   academicYear,
    yearLabel,
  };
}

