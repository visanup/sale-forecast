import { prisma } from '../db.js';
import { anchorMonthToDate } from './monthlyAccess.service.js';

const LOCKED_MESSAGE = 'ติดต่อ admin เพื่อปลดล็อค';

export class MonthlyAccessLockedError extends Error {
  code = 'MONTHLY_ACCESS_LOCKED';
  status = 403;

  constructor() {
    super(LOCKED_MESSAGE);
  }
}

function normalizeEmail(value?: string | null) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export async function assertMonthlyAccessUnlocked(params: {
  userEmail?: string | null;
  userRole?: string | null;
  anchorMonth: string;
}) {
  const { userEmail, userRole, anchorMonth } = params;
  if (!anchorMonth || !userEmail) return;
  if (userRole && userRole.toUpperCase() === 'ADMIN') return;
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) return;

  const record = await prisma.monthly_access_control.findUnique({
    where: {
      user_email_anchor_month: {
        user_email: normalizedEmail,
        anchor_month: anchorMonthToDate(anchorMonth)
      }
    }
  });

  if (record?.is_locked) {
    throw new MonthlyAccessLockedError();
  }
}
