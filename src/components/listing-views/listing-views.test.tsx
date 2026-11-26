import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'goget-vdom';
import { readViews, recordView } from '@/lib/listings';
import { ListingViewsCard } from './listing-views';

describe('listing views', () => {
    beforeEach(() => localStorage.clear());

    it('shows a zero total without bars before the first visit', () => {
        const root = document.createElement('div');
        render(root, <ListingViewsCard {...readViews(7)} />);
        expect(root.querySelector('strong')?.textContent).toBe('0');
        expect(root.querySelectorAll('li')).toHaveLength(0);
    });

    it('groups repeat visits, shifts the oldest day out and keeps the overall total', async () => {
        for (let day = 1; day <= 6; day++) {
            await recordView(7, new Date(2026, 10, day, 12));
        }
        await recordView(7, new Date(2026, 10, 6, 23, 59));
        const stats = readViews(7);
        expect(stats.total).toBe(7);
        expect(readViews(8).total).toBe(0);

        const root = document.createElement('div');
        render(root, <ListingViewsCard {...stats} />);
        expect([...root.querySelectorAll('time')].map((el) => el.dateTime)).toEqual([
            '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
        ]);
        expect([...root.querySelectorAll('li > span:first-child')].map((el) => el.textContent)).toEqual(['1', '1', '1', '1', '2']);
        expect(readViews(7)).toEqual(stats);
    });
});
