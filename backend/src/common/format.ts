const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Data de hoje (ou de um instante dado) no fuso informado, como 'YYYY-MM-DD'. */
export function todayInTz(timezone: string, now: Date = new Date()): string {
  // 'en-CA' formata como ISO: YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Converte o timestamp unix de uma mensagem do Telegram para 'YYYY-MM-DD' no fuso dado. */
export function dateFromUnixSeconds(
  unixSeconds: number,
  timezone: string,
): string {
  return todayInTz(timezone, new Date(unixSeconds * 1000));
}

export interface MonthRange {
  /** Primeiro dia do mês, 'YYYY-MM-01'. */
  start: string;
  /** Último dia do mês, 'YYYY-MM-DD'. */
  end: string;
  /** Rótulo legível, ex.: "Setembro de 2026". */
  label: string;
}

export function monthRangeFor(year: number, monthIndex0: number): MonthRange {
  const month = pad2(monthIndex0 + 1);
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${pad2(lastDay)}`,
    label: monthLabel(year, monthIndex0),
  };
}

export function currentMonthRange(
  timezone: string,
  now: Date = new Date(),
): MonthRange {
  const [year, month] = todayInTz(timezone, now).split('-').map(Number);
  return monthRangeFor(year, month - 1);
}

export function previousMonthRange(
  timezone: string,
  now: Date = new Date(),
): MonthRange {
  const [year, month] = todayInTz(timezone, now).split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  firstOfMonth.setUTCMonth(firstOfMonth.getUTCMonth() - 1);
  return monthRangeFor(
    firstOfMonth.getUTCFullYear(),
    firstOfMonth.getUTCMonth(),
  );
}

function monthLabel(year: number, monthIndex0: number): string {
  const nome = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthIndex0, 15)));
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
