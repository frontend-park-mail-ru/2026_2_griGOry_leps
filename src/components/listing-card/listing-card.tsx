import type { Child } from '@/vdom';
import './listing-card.scss';

export interface ListingCardProps {
    title?: string;
    /** Голубая карточка-подсказка с заголовком помельче */
    accent?: boolean;
    /** Дополнительный класс, например блок компонента внутри карточки */
    class?: string;
    label?: string;
    children?: Child;
}

export const ListingCard = ({ title, accent = false, class: extra, label, children }: ListingCardProps) => {
    const classes = ['listing-card'];
    if (accent) classes.push('listing-card--accent');
    if (extra) classes.push(extra);

    return (
        <section class={classes.join(' ')} aria-label={label}>
            {title && <h2 class="listing-card__title">{title}</h2>}
            {children}
        </section>
    );
};
