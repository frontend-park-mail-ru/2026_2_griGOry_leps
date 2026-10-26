import { assetUrl, type ListingStatus, type MyAdCard as MyAd } from '@/lib/api';
import { formatDay, formatPrice } from '@/lib/format';
import './my-ad-card.scss';

export interface MyAdCardProps {
    ad: MyAd;
    onCloseListing: (ad: MyAd) => void;
    onDelete: (ad: MyAd) => void;
}

type StatusTone = 'success' | 'warning' | 'error' | 'muted';

const STATUS: Record<ListingStatus, { label: string; tone: StatusTone }> = {
    active: { label: 'Активно', tone: 'success' },
    moderation: { label: 'На проверке', tone: 'warning' },
    rejected: { label: 'Не прошло проверку', tone: 'error' },
    draft: { label: 'Черновик', tone: 'muted' },
    closed: { label: 'Снято', tone: 'muted' },
    sold: { label: 'Продано', tone: 'muted' },
};

const DIMMED: ListingStatus[] = ['draft', 'closed', 'sold'];

function getMeta(ad: MyAd): string {
    const date = formatDay(ad.updated_at || ad.created_at);
    const parts = [
        ad.city,
        ad.has_delivery ? 'есть доставка' : '',
        date ? `${ad.status === 'draft' ? 'сохранено' : 'обновлено'} ${date}` : '',
    ];
    return parts.filter(Boolean).join(' · ');
}

function getPrice(ad: MyAd): string {
    return ad.is_free ? 'Даром' : `${formatPrice(ad.price)} ₽`;
}

export const MyAdCard = ({ ad, onCloseListing, onDelete }: MyAdCardProps) => {
    const { label, tone } = STATUS[ad.status];
    const dimmed = DIMMED.includes(ad.status);
    const canClose = ad.status === 'active' || ad.status === 'moderation';
    const imageUrl = assetUrl(ad.image_url);

    return (
        <article class="my-ad-card" data-ad-id={ad.id}>
            <div class={dimmed ? 'my-ad-card__photo my-ad-card__photo--dimmed' : 'my-ad-card__photo'}>
                {imageUrl && <img class="my-ad-card__image" src={imageUrl} alt={ad.title} loading="lazy" />}
            </div>

            <div class="my-ad-card__info">
                <span class={`my-ad-card__status my-ad-card__status--${tone}`}>
                    <span class="my-ad-card__dot" aria-hidden="true" />
                    {label}
                </span>
                <h3 class="my-ad-card__title">{ad.title}</h3>
                <span class="my-ad-card__price">{getPrice(ad)}</span>
                <span class="my-ad-card__meta">{getMeta(ad)}</span>
            </div>

            <div class="my-ad-card__actions">
                {ad.status === 'draft' && (
                    <button type="button" class="my-ad-card__action my-ad-card__action--primary" disabled>Продолжить</button>
                )}
                {ad.status === 'rejected' && (
                    <button type="button" class="my-ad-card__action" disabled>Исправить объявление</button>
                )}
                {canClose && (
                    <>
                        <button type="button" class="my-ad-card__action" disabled>Редактировать</button>
                        <button type="button" class="my-ad-card__action" onClick={() => onCloseListing(ad)}>Снять с продажи</button>
                    </>
                )}
                <button type="button" class="my-ad-card__delete" onClick={() => onDelete(ad)}>Удалить</button>
            </div>
        </article>
    );
};
