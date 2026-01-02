import { prisma } from './ingest.service.js';
import type { RequestActor } from '../utils/requestActor.js';

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

function anchorMonthToDate(anchorMonth: string) {
  return new Date(`${anchorMonth}-01T00:00:00.000Z`);
}

export async function assertMonthlyAccessUnlocked(anchorMonth: string, actor: RequestActor) {
  if (!anchorMonth) return;
  const userEmail = normalizeEmail(actor.user?.email);
  if (!userEmail) return;
  const userRole = actor.user?.role?.toUpperCase();
  if (userRole && userRole !== 'USER') {
    return;
  }

  const record = await prisma.monthly_access_control.findUnique({
    where: {
      user_email_anchor_month: {
        user_email: userEmail,
        anchor_month: anchorMonthToDate(anchorMonth)
      }
    },
    select: {
      is_locked: true
    }
  });

  if (record?.is_locked) {
    throw new MonthlyAccessLockedError();
  }
}
