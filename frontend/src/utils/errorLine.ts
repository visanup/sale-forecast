const LINE_PATTERNS = [/line\s*#?\s*(\d+)/i, /row\s*#?\s*(\d+)/i, /บรรทัด\s*(\d+)/i];

export function extractLineNumber(message?: string | null): string | null {
  if (!message) return null;
  for (const pattern of LINE_PATTERNS) {
    const match = pattern.exec(message);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function formatLineErrorMessage(message?: string | null, fallback = 'เกิดข้อผิดพลาด'): string {
  const base = message && message.trim().length > 0 ? message : fallback;
  const lineNumber = extractLineNumber(base);
  if (!lineNumber) {
    return base;
  }
  if (/Line\s*#?\s*\d+/i.test(base) || /บรรทัด\s*\d+/.test(base) || /row\s*\d+/i.test(base)) {
    return base;
  }
  return `Line #${lineNumber}: ${base}`;
}
