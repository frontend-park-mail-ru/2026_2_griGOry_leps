import type { AdCard, AdPage } from '@/lib/api';

export function appendListingPage(items: AdCard[], cursor: string | null, page: AdPage) {
    const seen = new Set(items.map((item) => item.id));
    const received = page.items ?? [];
    const added = received.filter((item) => !seen.has(item.id) && seen.add(item.id));
    const next = [...items, ...added];
    const nextCursor = page.next_cursor ?? null;

    return {
        items: next,
        total: page.total,
        cursor: nextCursor,
        complete: next.length >= page.total || received.length === 0 || (added.length === 0 && nextCursor === cursor),
    };
}
