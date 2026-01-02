import { SalesForecastMetadata, SalesForecastRecord } from '../services/api';

export type HistoryConfirmationSnapshot = {
  confirmed: boolean;
  label: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  lastUpdatedAt: string | null;
};

type ConfirmationUpdateOptions = {
  confirmed: boolean;
  actor?: string | null;
};

const TRUE_STRINGS = new Set(['1', 'true', 'yes', 'y', 'confirmed', 'done']);

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) return false;
    return TRUE_STRINGS.has(normalized);
  }
  return false;
}

function coerceIsoString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
}

function coerceActorLabel(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export function getHistoryConfirmationSnapshot(record: SalesForecastRecord): HistoryConfirmationSnapshot {
  const metadata = record.metadata ?? {};
  const metadataRecord = metadata as Record<string, unknown>;

  const confirmed =
    parseBooleanFlag(metadataRecord.confirmed) ||
    parseBooleanFlag(metadataRecord.confirm_state) ||
    parseBooleanFlag(metadataRecord.confirm_status);

  const confirmedBy =
    coerceActorLabel(metadataRecord.confirmed_by) ||
    coerceActorLabel(metadataRecord.confirmedBy) ||
    null;

  const confirmedAt =
    coerceIsoString(metadataRecord.confirmed_at) ||
    coerceIsoString(metadataRecord.confirmedAt) ||
    null;

  const lastUpdatedAt =
    coerceIsoString(metadataRecord.confirm_updated_at) ||
    coerceIsoString(metadataRecord.confirmation_updated_at) ||
    confirmedAt;

  return {
    confirmed,
    label: confirmed ? 'Confirmed' : 'Pending',
    confirmedBy,
    confirmedAt,
    lastUpdatedAt
  };
}

export function buildUpdatedConfirmationMetadata(
  existing: SalesForecastMetadata | null | undefined,
  options: ConfirmationUpdateOptions
): SalesForecastMetadata {
  const base: SalesForecastMetadata = {
    ...(existing ?? {})
  };

  const timestamp = new Date().toISOString();
  base.confirmed = options.confirmed;
  base.confirm_state = options.confirmed ? 'CONFIRMED' : 'UNCONFIRMED';
  base.confirm_updated_at = timestamp;
  base.confirmed_at = options.confirmed ? timestamp : null;
  base.confirmed_by = options.actor ?? null;

  return base;
}

export function formatConfirmationDetail(snapshot: HistoryConfirmationSnapshot): string {
  const { confirmed, confirmedAt, confirmedBy, lastUpdatedAt } = snapshot;
  const actorText = confirmedBy ? `by ${confirmedBy}` : '';

  const dateSource = confirmed ? confirmedAt : lastUpdatedAt;
  const dateText = (() => {
    if (!dateSource) return '';
    const parsed = new Date(dateSource);
    if (Number.isNaN(parsed.getTime())) return '';
    return `on ${parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}`;
  })();

  if (confirmed) {
    if (!actorText && !dateText) return 'Confirmed';
    return ['Confirmed', actorText, dateText].filter(Boolean).join(' ').trim();
  }

  if (!actorText && !dateText) return 'Pending confirmation';
  const pieces = ['Pending confirmation'];
  if (actorText) pieces.push(actorText);
  if (dateText) pieces.push(dateText);
  return pieces.join(' ').trim();
}

export function resolveLastActorLabel(record: SalesForecastRecord): string {
  const actor = record.last_actor;
  if (!actor) return '';
  const candidates = [
    actor.user_username,
    actor.user_email,
    actor.performed_by,
    actor.user_id,
    actor.client_id
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return '';
}
