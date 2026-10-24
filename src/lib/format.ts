const rublesFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const kopecksFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPrice(price: string | number): string {
    const value = Number(String(price).replace(/\s/g, '').replaceAll(',', '.'));
    if (!Number.isFinite(value)) return String(price);
    return Number.isInteger(value) ? rublesFormatter.format(value) : kopecksFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
export function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date).replace(/\s?г\.$/, '');
}


export function formatMonthSince(iso: string): string {
    return formatDate(iso).replace(/^\d+\s/, '');
}

export function plural(n: number, [one, few, many]: [string, string, string]): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}
