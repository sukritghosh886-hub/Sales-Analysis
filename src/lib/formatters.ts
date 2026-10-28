/**
 * Financial & Date Formatting Utilities for Indian Small Businesses
 */

export function formatCurrency(
  amount: number,
  currencySymbol = '₹',
  compact = false
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${currencySymbol}0.00`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (compact) {
    if (absAmount >= 10000000) {
      // 1 Crore = 10,000,000
      const cr = (absAmount / 10000000).toFixed(2);
      return `${isNegative ? '-' : ''}${currencySymbol}${cr} Cr`;
    }
    if (absAmount >= 100000) {
      // 1 Lakh = 100,000
      const lk = (absAmount / 100000).toFixed(2);
      return `${isNegative ? '-' : ''}${currencySymbol}${lk} L`;
    }
    if (absAmount >= 1000) {
      const k = (absAmount / 1000).toFixed(1);
      return `${isNegative ? '-' : ''}${currencySymbol}${k} k`;
    }
  }

  // Format with Indian numbering system (Lakhs, Crores): e.g. 12,34,567.89
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian comma formatting: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${isNegative ? '-' : ''}${currencySymbol}${integerPart}.${decimalPart}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + (dateString.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatMonthYear(monthKey: string): string {
  // '2025-04' -> 'Apr 2025'
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
