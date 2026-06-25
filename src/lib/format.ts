export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KRW", symbol: "₩", name: "Korean Won" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "NZD", symbol: "NZ$", name: "NZ Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
];

export function formatCurrency(amount: number | string | null | undefined, currency = "USD", locale = "en-US") {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (!isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency + " ";
    return `${sym}${n.toFixed(2)}`;
  }
}

export function formatNumber(n: number | string | null | undefined, opts: Intl.NumberFormatOptions = {}) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (!isFinite(v)) return "—";
  return new Intl.NumberFormat(undefined, opts).format(v);
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, opts).format(date);
}

export function formatRelative(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export function startOfDay(d: Date = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function endOfDay(d: Date = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
export function startOfMonth(d: Date = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function endOfMonth(d: Date = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
export function startOfYear(d: Date = new Date()) { return new Date(d.getFullYear(), 0, 1); }
export function endOfYear(d: Date = new Date()) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }

export function toISODate(d: Date) { return d.toISOString().slice(0,10); }