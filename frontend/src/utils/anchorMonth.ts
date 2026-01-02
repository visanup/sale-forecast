const ANCHOR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function normalizeAnchorMonth(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (ANCHOR_MONTH_REGEX.test(trimmed)) {
    return trimmed;
  }
  return trimmed.slice(0, 7);
}

export function getCurrentAnchorMonth(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isCurrentAnchorMonth(anchorMonth: string, referenceDate = new Date()): boolean {
  const normalized = normalizeAnchorMonth(anchorMonth);
  if (!normalized) return false;
  return normalized === getCurrentAnchorMonth(referenceDate);
}

type ConfirmOptions = {
  contextLabel?: string;
  message?: string;
};

export function confirmCrossMonth(anchorMonth: string, options?: ConfirmOptions): boolean {
  const normalized = normalizeAnchorMonth(anchorMonth);
  if (!normalized || isCurrentAnchorMonth(normalized)) {
    return true;
  }
  const context = options?.contextLabel ? ` (${options.contextLabel})` : '';
  const defaultMessage = `Anchor Month ${normalized} ไม่ตรงกับเดือนปัจจุบัน คุณกำลังอัปโหลดข้อมูลข้ามเดือน${context}. ต้องการดำเนินการต่อหรือไม่?`;
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(options?.message || defaultMessage);
  }
  return true;
}
