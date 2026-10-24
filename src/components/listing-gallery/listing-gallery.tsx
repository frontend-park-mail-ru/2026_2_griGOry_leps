import { Component } from '@/vdom';
import type { ListingPhoto } from '@/lib/api';
import './listing-gallery.scss';

export interface ListingGalleryProps {
    photos: ListingPhoto[];
    title: string;
}

export class ListingGallery extends Component<ListingGalleryProps, { index: number }> {
    state = { index: 0 };

    show = (index: number) => {
        const count = this.props.photos.length;
        if (count) this.setState({ index: (index + count) % count });
    };

    render() {
        const { photos, title } = this.props;
        const index = Math.min(this.state.index, Math.max(photos.length - 1, 0));
        const current = photos[index];
        const many = photos.length > 1;

        return (
            <div class="listing-gallery">
                <div class="listing-gallery__main">
                    {current
                        ? <img src={current.url} alt={title} />
                        : <span class="listing-gallery__empty">Нет фото</span>}
                    {many && [
                        <button
                            type="button"
                            class="listing-gallery__arrow listing-gallery__arrow--prev"
                            aria-label="Предыдущее фото"
                            onClick={() => this.show(index - 1)}
                        />,
                        <button
                            type="button"
                            class="listing-gallery__arrow listing-gallery__arrow--next"
                            aria-label="Следующее фото"
                            onClick={() => this.show(index + 1)}
                        />,
                        <span class="listing-gallery__counter">{index + 1} / {photos.length}</span>,
                    ]}
                </div>
                {many && (
                    <div class="listing-gallery__thumbs">
                        {photos.map((photo, i) => (
                            <button
                                key={photo.id}
                                type="button"
                                class={i === index ? 'listing-gallery__thumb listing-gallery__thumb--active' : 'listing-gallery__thumb'}
                                aria-label={`Фото ${i + 1}`}
                                aria-pressed={String(i === index)}
                                onClick={() => this.show(i)}
                            >
                                <img src={photo.thumb_url} alt="" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }
}
