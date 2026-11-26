export interface DailyViews {
    date: string;
    count: number;
}

export interface ListingViews {
    total: number;
    days: DailyViews[];
}

const MAX_DAYS = 5;
const memory = new Map<number, ListingViews>();

export function viewsKey(id: number): string {
    return `goget.listing-views.v1.${id}`;
}

export function localDay(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

export function readViews(id: number): ListingViews {
    const fallback = memory.get(id);
    if (fallback) return fallback;
    try {
        const raw = localStorage.getItem(viewsKey(id));
        if (raw) {
            const stats = JSON.parse(raw) as ListingViews;
            if (Number.isSafeInteger(stats.total) && stats.total >= 0 && Array.isArray(stats.days)
                && stats.days.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isSafeInteger(day.count) && day.count > 0)) {
                return stats;
            }
        }
    } catch {
        return { total: 0, days: [] };
    }
    return { total: 0, days: [] };
}

export async function recordView(id: number, now = new Date()): Promise<ListingViews> {
    const date = localDay(now);
    const update = () => {
        const { total, days } = readViews(id);
        const counts = new Map(days.map((day) => [day.date, day.count]));
        counts.set(date, (counts.get(date) ?? 0) + 1);
        const stats = {
            total: total + 1,
            days: Array.from(counts, ([day, count]) => ({ date: day, count }))
                .sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS),
        };
        try {
            localStorage.setItem(viewsKey(id), JSON.stringify(stats));
            memory.delete(id);
        } catch {
            memory.set(id, stats);
        }
        return stats;
    };
    return navigator.locks ? navigator.locks.request(viewsKey(id), update) : update();
}
