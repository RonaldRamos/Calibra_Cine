/**
 * Helper to format date strings into Brazilian Dia-Mês-Ano format (DD/MM/AAAA).
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Already in DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
    return trimmed.replace(/-/g, '/');
  }

  // Handle YYYY-MM-DD format (including timestamp suffixes)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const cleanDate = trimmed.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }

  // Fallback to JS Date parser if valid
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch {
    // Ignore and fallback
  }

  return trimmed;
}

export function formatDateTimeBR(dateStr?: string | null, timeStr?: string | null): string {
  const formattedDate = formatDateBR(dateStr);
  if (!formattedDate) return timeStr || '';
  if (!timeStr) return formattedDate;
  return `${formattedDate} às ${timeStr}`;
}
