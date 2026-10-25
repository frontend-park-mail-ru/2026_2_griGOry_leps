const priceFormatter = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
});

const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const sinceFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

const ratingFormatter = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export function formatPrice(price: string | number): string {
    const value = Number(String(price).replace(/\s/g, '').replaceAll(',', '.'));
    return Number.isFinite(value) ? priceFormatter.format(value) : String(price);
}

function toDate(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(value: string): string {
    const date = toDate(value);
    return date ? dayFormatter.format(date) : '';
}

export function formatSince(value: string): string {
    const date = toDate(value);
    return date ? sinceFormatter.format(date).replace(/^\d+\s*/, '').replace(/\s*г\.$/, '') : '';
}

export function formatRating(value: number): string {
    return ratingFormatter.format(value);
}

export function plural(count: number, [one, few, many]: [string, string, string]): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

export function formatAddress({ street, house }: { street: string; house: string }): string {
    return [street.trim(), house.trim()].filter(Boolean).join(', ');
}
