import { ProductCard } from '@/components/product-card/product-card';
import { normalizePrice, type ListingFormValues } from '@/lib/listing-form';
import './listing-preview.scss';

export interface ListingPreviewProps {
    values: ListingFormValues;
    /** Превью первого фото; null — фото нет */
    cover: string | null;
}

export const ListingPreview = ({ values, cover }: ListingPreviewProps) => {
    const title = values.title.trim();
    const address = values.address.trim();
    const filled = title || cover || values.price || values.is_free;

    return (
        <section class="listing-preview">
            <h2 class="listing-preview__title">Так увидят покупатели</h2>
            {filled ? (
                <ProductCard
                    id={0}
                    link={false}
                    title={title || 'Название объявления'}
                    price={normalizePrice(values.price) || '0'}
                    is_free={values.is_free}
                    image_url={cover}
                    city=""
                    has_delivery={values.has_delivery}
                    created_at=""
                    meta={address ? `${address} · размещено сегодня` : 'Размещено сегодня'}
                />
            ) : (
                <div class="listing-preview__skeleton" aria-hidden="true">
                    <span class="listing-preview__skeleton-img" />
                    <span class="listing-preview__skeleton-line listing-preview__skeleton-line--short" />
                    <span class="listing-preview__skeleton-line" />
                    <span class="listing-preview__skeleton-line listing-preview__skeleton-line--mid" />
                </div>
            )}
        </section>
    );
};
