import { describe, expect, it } from 'vitest';
import { render } from 'goget-vdom';
import { ListingViewsCard } from './listing-views';

describe('listing views', () => {
    it('shows a zero total without bars before the first visit', () => {
        const root = document.createElement('div');
        render(root, <ListingViewsCard total={0} days={[]} />);
        expect(root.querySelector('strong')?.textContent).toBe('0');
        expect(root.querySelectorAll('li')).toHaveLength(0);
    });

    it('shows the five daily values from the API in order and the all-time total', () => {
        const days = [2, 3, 4, 5, 6].map((day) => ({ date: `2026-11-0${day}`, count: day === 6 ? 2 : 1 }));
        const root = document.createElement('div');
        render(root, <ListingViewsCard total={7} days={days} />);
        expect([...root.querySelectorAll('time')].map((el) => el.dateTime)).toEqual([
            '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
        ]);
        expect([...root.querySelectorAll('li > span:first-child')].map((el) => el.textContent)).toEqual(['1', '1', '1', '1', '2']);
        expect(root.querySelector('strong')?.textContent).toBe('7');
    });
});
