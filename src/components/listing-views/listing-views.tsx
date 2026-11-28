import { ListingCard } from '@/components/listing-card/listing-card';
import type { Listing } from '@/lib/api';
import './listing-views.scss';

const label = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

const moscowDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' });

interface ListingViewsProps {
    total: number;
    days: Listing['views_by_day'];
}

export const ListingViewsCard = ({ total, days }: ListingViewsProps) => {
    const today = moscowDay.format(new Date());
    const todayCount = days.find((day) => day.date === today)?.count ?? 0;
    const peak = Math.max(1, ...days.map((day) => day.count));

    return (
        <ListingCard title="Просмотры">
            <div class="listing-views__summary">
                <strong class="listing-views__total">{total.toLocaleString('ru-RU')}</strong>
                {todayCount > 0 && <span class="listing-views__today-count">+{todayCount.toLocaleString('ru-RU')} сегодня</span>}
            </div>
            {days.length > 0 && (
                <ol class="listing-views__chart" aria-label="Просмотры по дням">
                    {days.map(({ date, count }) => (
                        <li key={date} class={date === today ? 'listing-views__day listing-views__day--today' : 'listing-views__day'}>
                            <span>{count.toLocaleString('ru-RU')}</span>
                            <span class="listing-views__bar" style={{ height: `${Math.max(3, 72 * count / peak)}px` }} aria-hidden="true" />
                            <time dateTime={date}>{date === today ? 'Сегодня' : label.format(new Date(date + 'T12:00:00'))}</time>
                        </li>
                    ))}
                </ol>
            )}
        </ListingCard>
    );
};
