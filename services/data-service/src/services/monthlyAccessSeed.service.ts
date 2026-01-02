import fetch from 'node-fetch';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config/config.js';
import { anchorMonthToDate } from './monthlyAccess.service.js';

type DirectoryUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  isActive?: boolean | null;
};

export type MonthlyAccessSeedUser = {
  user_email: string;
  user_id?: string | null;
  user_name?: string | null;
};

export type MonthlyAccessSeedOptions = {
  users?: MonthlyAccessSeedUser[];
  anchorMonths?: string[];
};

export type MonthlyAccessSeedResult = {
  processedUsers: number;
  anchorMonths: string[];
  recordsEnsured: number;
};

function normalizeEmail(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeText(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDisplayName(user: DirectoryUser) {
  const first = normalizeText(user.firstName);
  const last = normalizeText(user.lastName);
  const parts = [first, last].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    return parts.join(' ');
  }
  const username = normalizeText(user.username);
  if (username) return username;
  return normalizeEmail(user.email);
}

function uniqueUsers(users: MonthlyAccessSeedUser[] = []) {
  const dedup = new Map<string, MonthlyAccessSeedUser>();

  for (const raw of users) {
    const email = normalizeEmail(raw?.user_email);
    if (!email) continue;
    const sanitizedId = normalizeText(raw?.user_id);
    const normalized: MonthlyAccessSeedUser = {
      user_email: email,
      user_id: sanitizedId ?? null,
      user_name: normalizeText(raw?.user_name)
    };
    dedup.set(email, normalized);
  }

  return Array.from(dedup.values());
}

function normalizeAnchorMonths(anchorMonths?: string[]) {
  const seen = new Set<string>();
  const months: string[] = [];
  if (Array.isArray(anchorMonths)) {
    for (const raw of anchorMonths) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      months.push(trimmed);
    }
  }
  if (months.length > 0) {
    return months;
  }
  return defaultAnchorMonths();
}

export function defaultAnchorMonths(reference = new Date()) {
  const current = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const next = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  return [current, next].map((date) => date.toISOString().slice(0, 7));
}

async function fetchActiveUsers(): Promise<MonthlyAccessSeedUser[]> {
  if (!config.authServiceUrl || !config.internalSecret) {
    return [];
  }

  const url = new URL('/internal/users', config.authServiceUrl);
  url.searchParams.set('role', 'USER');
  url.searchParams.set('isActive', 'true');

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Internal-Secret': config.internalSecret
    }
  });

  if (!resp.ok) {
    throw new Error(`auth-service responded with status ${resp.status}`);
  }

  const payload = (await resp.json()) as { users?: DirectoryUser[] };
  const directoryUsers = payload?.users ?? [];

  return directoryUsers
    .filter((user) => normalizeEmail(user.email))
    .map((user) => ({
      user_email: normalizeEmail(user.email),
      user_id: user.id || null,
      user_name: buildDisplayName(user)
    }));
}

export async function seedDefaultMonthlyAccess(options?: MonthlyAccessSeedOptions): Promise<MonthlyAccessSeedResult> {
  const anchorMonths = normalizeAnchorMonths(options?.anchorMonths);
  const anchorDates = anchorMonths.map((month) => anchorMonthToDate(month));

  let targetUsers = uniqueUsers(options?.users);
  if (targetUsers.length === 0) {
    targetUsers = uniqueUsers(await fetchActiveUsers());
  }

  if (targetUsers.length === 0) {
    return {
      processedUsers: 0,
      anchorMonths,
      recordsEnsured: 0
    };
  }

  let updates = 0;
  for (const user of targetUsers) {
    const userId = normalizeText(user.user_id);
    const userName = normalizeText(user.user_name);
    for (const anchorDate of anchorDates) {
      const data: Prisma.monthly_access_controlCreateInput = {
        user_email: user.user_email,
        user_id: userId,
        user_name: userName,
        anchor_month: anchorDate,
        is_locked: false
      };

      await prisma.monthly_access_control.upsert({
        where: {
          user_email_anchor_month: {
            user_email: data.user_email,
            anchor_month: data.anchor_month
          }
        },
        update: {
          user_id: data.user_id,
          user_name: data.user_name
        },
        create: data
      });
      updates += 1;
    }
  }

  return {
    processedUsers: targetUsers.length,
    anchorMonths,
    recordsEnsured: updates
  };
}
