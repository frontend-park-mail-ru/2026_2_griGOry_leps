import { ListingCard } from '@/components/listing-card/listing-card';
import { localDay, type ListingViews } from '@/lib/listings';
import './listing-views.scss';

const label = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export const ListingViewsCard = ({ total, days }: ListingViews) => {
    const today = localDay(new Date());
    const todayCount = days.find((day) => day.date === today)?.count ?? 0;
    const peak = Math.max(1, ...days.map((day) => day.count));

    return (
        <ListingCard title="Просмотры">
            <div class="listing-views__summary">
                <strong>{total.toLocaleString('ru-RU')}</strong>
                {todayCount > 0 && <span>+{todayCount.toLocaleString('ru-RU')} сегодня</span>}
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
