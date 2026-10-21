import { Component } from '@/vdom';
import './listing-form-page.scss';

import { Button } from '@/components/button/button';
import { FormField } from '@/components/form-field/form-field';
import { PhotoUploader, type PhotoItem } from '@/components/photo-uploader/photo-uploader';
import { ProductCard } from '@/components/product-card/product-card';
import {
    ApiError, createListing, updateListing, uploadListingPhoto,
    type CategoryNode, type Condition, type Listing, type ListingData,
} from '@/lib/api';
import { plural } from '@/lib/format';
import {
    CONDITION_LABELS, DESCRIPTION_MAX, PHOTOS_MAX, PHOTO_MAX_BYTES, PHOTO_TYPES, TITLE_MAX,
    categoryGroups, normalizePrice, sanitizePrice, validateListing,
    type ListingFormErrors, type ListingFormValues,
} from '@/lib/listing';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { navigate } from '@/router/router';

export interface ListingFormPageProps {
    categories: CategoryNode[];
    /** Без listing — создание */
    listing?: Listing;
}

export interface ListingFormState {
    values: ListingFormValues;
    photos: PhotoItem[];
    errors: ListingFormErrors;
    summary: string;
    formError: string;
    submitting: boolean;
    published: Listing | null;
}

type TextField = 'title' | 'description' | 'price' | 'address' | 'category_id' | 'condition';
type FlagField = 'is_free' | 'is_negotiable' | 'has_delivery';

const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[];

const TIPS = [
    'Сделайте 3–5 фото при дневном свете',
    'В названии — модель и состояние',
    'Цена чуть ниже рынка — продаётся в 2 раза быстрее',
    'Отвечайте на сообщения в течение часа',
];

const SERVER_FIELDS: Record<string, keyof ListingFormErrors> = {
    category_id: 'category_id',
    title: 'title',
    photo_ids: 'photos',
    description: 'description',
    price: 'price',
    condition: 'condition',
    address: 'address',
};

const SERVER_MESSAGES: Partial<Record<keyof ListingFormErrors, string>> = {
    category_id: 'Выберите категорию из списка',
    title: `Название от 1 до ${TITLE_MAX} символов`,
    photos: 'Загрузите фото заново',
    description: `Описание не длиннее ${DESCRIPTION_MAX} символов`,
    price: 'Укажите цену в рублях',
    condition: 'Выберите состояние',
    address: 'Укажите адрес',
};

function initialValues(listing?: Listing): ListingFormValues {
    return {
        category_id: listing?.category ? String(listing.category.id) : '',
        title: listing?.title ?? '',
        description: listing?.description ?? '',
        price: listing && listing.price !== null && !listing.is_free ? listing.price.replace(/\.00$/, '') : '',
        is_free: listing?.is_free ?? false,
        is_negotiable: listing?.is_negotiable ?? false,
        condition: listing?.condition ?? '',
        address: listing?.address ?? '',
        has_delivery: listing?.has_delivery ?? false,
    };
}

function photoError(err: unknown): string {
    if (!(err instanceof ApiError)) return 'Не загрузилось';
    if (err.status === 413) return 'Больше 5 МБ';
    if (err.status === 415) return 'Только JPG или PNG';
    if (err.status === 400) return 'Файл повреждён';
    if (err.network || err.timeout) return 'Нет связи с сервером';
    return 'Не загрузилось';
}

function summaryText(count: number): string {
    if (!count) return '';
    return `Не получилось опубликовать: заполните ${count} ${plural(count, ['обязательное поле', 'обязательных поля', 'обязательных полей'])}, `
        + `${count === 1 ? 'оно отмечено' : 'они отмечены'} красным`;
}

let photoKey = 0;

export class ListingFormPage extends Component<ListingFormPageProps, ListingFormState> {
    submitted = false;
    blobUrls = new Set<string>();

    constructor(props: ListingFormPageProps) {
        super(props);
        this.state = {
            values: initialValues(props.listing),
            photos: (props.listing?.photos ?? []).map((photo) => ({
                key: `p${++photoKey}`,
                id: photo.id,
                preview: photo.thumb_url,
                uploading: false,
                error: '',
            })),
            errors: {},
            summary: '',
            formError: '',
            submitting: false,
            published: null,
        };
    }

    componentWillUnmount() {
        this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    }

    get isEdit(): boolean {
        return Boolean(this.props.listing);
    }

    get isDraft(): boolean {
        return this.props.listing?.status === 'draft';
    }

    update(values: Partial<ListingFormValues>, photos = this.state.photos) {
        const next = { ...this.state.values, ...values };
        const patch: Partial<ListingFormState> = { values: next, photos };
        if (this.submitted) {
            const errors = validateListing(next, this.readyPhotos(photos).length, this.isDraft);
            patch.errors = errors;
            if (this.state.summary) patch.summary = summaryText(Object.keys(errors).length);
        }
        this.setState(patch);
    }

    readyPhotos(photos = this.state.photos): number[] {
        return photos.filter((p) => p.id !== null && !p.uploading && !p.error).map((p) => p.id as number);
    }

    handleText = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const name = input.name as TextField;
        const value = name === 'price' ? sanitizePrice(input.value) : input.value;
        if (name === 'price') input.value = value;
        this.update({ [name]: value });
    };

    handlePriceChange = () => {
        this.update({ price: normalizePrice(this.state.values.price) });
    };

    handleFlag = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const name = input.name as FlagField;
        const patch: Partial<ListingFormValues> = { [name]: input.checked };
        if (name === 'is_free' && input.checked) {
            patch.price = '';
            patch.is_negotiable = false;
        }
        this.update(patch);
    };

    handleAddPhotos = (files: File[]) => {
        const free = PHOTOS_MAX - this.state.photos.length;
        const accepted = files.slice(0, free);
        let message = files.length > free ? `Можно добавить не больше ${PHOTOS_MAX} фото` : '';

        const added: PhotoItem[] = [];
        accepted.forEach((file) => {
            if (!PHOTO_TYPES.includes(file.type)) {
                message = 'Подходят только фото в JPG или PNG';
                return;
            }
            if (file.size > PHOTO_MAX_BYTES) {
                message = 'Фото должно быть не больше 5 МБ';
                return;
            }

            const preview = URL.createObjectURL(file);
            this.blobUrls.add(preview);
            const item: PhotoItem = { key: `p${++photoKey}`, id: null, preview, uploading: true, error: '' };
            added.push(item);
            void this.upload(item.key, file);
        });

        this.update({}, [...this.state.photos, ...added]);
        const errors = { ...this.state.errors };
        if (message) errors.photos = message;
        else delete errors.photos;
        this.setState({ errors });
    };

    async upload(key: string, file: File) {
        let patch: Partial<PhotoItem>;
        try {
            const uploaded = await uploadListingPhoto(file);
            patch = { id: uploaded.id, preview: uploaded.thumb_url, uploading: false };
        } catch (err) {
            logWarn('Не удалось загрузить фото:', err);
            if (err instanceof ApiError && err.status === 401) {
                navigate('/login');
                return;
            }
            patch = { uploading: false, error: photoError(err) };
        }

        const photos = this.state.photos.map((p) => {
            if (p.key !== key) return p;
            if (patch.id !== undefined) this.revoke(p.preview);
            return { ...p, ...patch };
        });
        this.update({}, photos);
    }

    revoke(url: string) {
        if (this.blobUrls.delete(url)) URL.revokeObjectURL(url);
    }

    handleRemovePhoto = (key: string) => {
        const photo = this.state.photos.find((p) => p.key === key);
        if (photo) this.revoke(photo.preview);
        this.update({}, this.state.photos.filter((p) => p.key !== key));
    };

    handleMovePhoto = (key: string, target: string) => {
        const photos = [...this.state.photos];
        const from = photos.findIndex((p) => p.key === key);
        const to = photos.findIndex((p) => p.key === target);
        if (from < 0 || to < 0) return;
        const [moved] = photos.splice(from, 1);
        photos.splice(to, 0, moved);
        this.update({}, photos);
    };

    collect(onlyFilled: boolean): ListingData {
        const { values } = this.state;
        const photoIds = this.readyPhotos();
        const data: ListingData = {
            title: values.title.trim(),
            description: values.description.trim(),
            is_free: values.is_free,
            is_negotiable: values.is_free ? false : values.is_negotiable,
            has_delivery: values.has_delivery,
        };

        if (values.category_id) data.category_id = Number(values.category_id);
        if (values.condition) data.condition = values.condition;
        if (values.address.trim()) data.address = values.address.trim();
        if (!values.is_free && values.price) data.price = normalizePrice(values.price);
        if (photoIds.length || !onlyFilled) data.photo_ids = photoIds;
        if (onlyFilled && !data.description) delete data.description;

        return data;
    }

    submit = async (asDraft: boolean) => {
        this.submitted = true;
        this.setState({ formError: '', summary: '' });

        const { photos, values } = this.state;
        if (photos.some((p) => p.uploading)) {
            this.setState({ formError: 'Дождитесь, пока загрузятся все фото' });
            return;
        }
        if (photos.some((p) => p.error)) {
            this.setState({ errors: { ...this.state.errors, photos: 'Удалите фото, которые не загрузились' } });
            this.focusFirstError();
            return;
        }

        const loose = asDraft || this.isDraft;
        const errors = validateListing(values, this.readyPhotos().length, loose);
        const count = Object.keys(errors).length;
        this.setState({ errors, summary: loose ? '' : summaryText(count) });
        if (count) {
            this.focusFirstError();
            return;
        }

        this.setState({ submitting: true });
        try {
            const data = this.collect(loose);
            if (this.props.listing) {
                const saved = await updateListing(this.props.listing.id, data);
                showToast('Изменения сохранены');
                navigate(`/listing/${saved.id}`);
            } else if (asDraft) {
                const saved = await createListing({ ...data, publish: false });
                showToast('Черновик сохранён');
                navigate(`/listing/${saved.id}`);
            } else {
                const saved = await createListing({ ...data, publish: true });
                this.setState({ published: saved, submitting: false });
                window.scrollTo(0, 0);
            }
        } catch (err) {
            logWarn('Не удалось сохранить объявление:', err);
            this.setState({ submitting: false });
            this.showServerError(err);
        }
    };

    showServerError(err: unknown) {
        if (!(err instanceof ApiError)) {
            this.setState({ formError: 'Не удалось сохранить объявление. Попробуйте ещё раз' });
            return;
        }

        const field = SERVER_FIELDS[err.field];
        if (err.status === 400 && field) {
            this.setState({ errors: { ...this.state.errors, [field]: SERVER_MESSAGES[field] } });
            this.focusFirstError();
            return;
        }

        if (err.status === 401) {
            navigate('/login');
            return;
        }

        let message = 'Не удалось сохранить объявление. Попробуйте ещё раз';
        if (err.network) message = 'Нет соединения с сервером. Проверьте интернет';
        else if (err.timeout) message = 'Сервер не отвечает. Попробуйте ещё раз';
        else if (err.status === 409) message = 'Проданное объявление нельзя изменить';
        else if (err.status === 403) message = 'Это объявление нельзя редактировать';
        else if (err.status === 404) message = 'Объявление не найдено. Возможно, его удалили';
        this.setState({ formError: message });
    }

    focusFirstError() {
        requestAnimationFrame(() => {
            const el = document.querySelector('.listing-form [aria-invalid="true"], .listing-form .photo-uploader--error');
            if (el instanceof HTMLElement) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                if (el.matches('input, select, textarea')) el.focus({ preventScroll: true });
            }
        });
    }

    handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        void this.submit(false);
    };

    handleCreateAnother = () => {
        this.submitted = false;
        this.setState({
            values: initialValues(),
            photos: [],
            errors: {},
            summary: '',
            formError: '',
            published: null,
        });
        window.scrollTo(0, 0);
    };

    renderCategory() {
        const { values, errors } = this.state;
        const error = errors.category_id ?? '';

        return (
            <div class={error ? 'form-field form-field--error' : 'form-field'}>
                <div class="form-field__control listing-form__select">
                    <select
                        id="listing-category"
                        name="category_id"
                        class={values.category_id ? 'form-field__input' : 'form-field__input listing-form__placeholder'}
                        value={values.category_id}
                        aria-label="Категория"
                        aria-invalid={String(Boolean(error))}
                        onChange={this.handleText}
                    >
                        <option value="" disabled>Выберите категорию</option>
                        {categoryGroups(this.props.categories).map((group) => (
                            <optgroup key={group.name} label={group.name}>
                                {group.options.map((opt) => (
                                    <option key={opt.id} value={String(opt.id)}>{opt.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <p class="form-field__error" data-error-for="category_id">{error || null}</p>
            </div>
        );
    }

    renderDescription() {
        const { values, errors } = this.state;
        const error = errors.description ?? '';

        return (
            <div class={error ? 'form-field form-field--error' : 'form-field'}>
                <div class="form-field__control listing-form__textarea">
                    <textarea
                        id="listing-description"
                        name="description"
                        class="form-field__input"
                        rows="4"
                        aria-label="Описание"
                        placeholder="Расскажите о товаре: состояние, комплектация, причина продажи"
                        value={values.description}
                        aria-invalid={String(Boolean(error))}
                        onInput={this.handleText}
                    />
                    <span class="listing-form__counter">{values.description.length} / {DESCRIPTION_MAX}</span>
                </div>
                <p class="form-field__error" data-error-for="description">{error || null}</p>
            </div>
        );
    }

    renderCondition() {
        const { values, errors } = this.state;
        const error = errors.condition ?? '';

        return (
            <fieldset class={error ? 'listing-form__group listing-form__group--error' : 'listing-form__group'}>
                <legend class="form-field__label">Состояние</legend>
                <div class="listing-form__options">
                    {CONDITIONS.map((condition) => (
                        <label key={condition} class="listing-form__option">
                            <input
                                type="radio"
                                name="condition"
                                value={condition}
                                checked={values.condition === condition}
                                aria-invalid={String(Boolean(error))}
                                onChange={this.handleText}
                            />
                            {CONDITION_LABELS[condition]}
                        </label>
                    ))}
                </div>
                <p class="form-field__error" data-error-for="condition">{error || null}</p>
            </fieldset>
        );
    }

    renderCheckbox(name: FlagField, label: string, hint?: string) {
        return (
            <label class="listing-form__check">
                <input
                    type="checkbox"
                    name={name}
                    checked={this.state.values[name]}
                    onChange={this.handleFlag}
                />
                <span class="listing-form__check-text">
                    {label}
                    {hint && <span class="listing-form__check-hint">{hint}</span>}
                </span>
            </label>
        );
    }

    renderPreview() {
        const { values, photos } = this.state;
        const cover = photos.find((p) => !p.error);
        const filled = values.title.trim() || cover || values.price || values.is_free;

        return (
            <section class="listing-aside__card">
                <h2 class="listing-aside__title">Так увидят покупатели</h2>
                {filled ? (
                    <ProductCard
                        id={this.props.listing?.id ?? 0}
                        link={false}
                        title={values.title.trim() || 'Название объявления'}
                        price={normalizePrice(values.price) || '0'}
                        is_free={values.is_free}
                        image_url={cover?.preview ?? null}
                        city=""
                        has_delivery={values.has_delivery}
                        created_at=""
                        meta={values.address.trim() ? `${values.address.trim()} · размещено сегодня` : 'Размещено сегодня'}
                    />
                ) : (
                    <div class="listing-aside__skeleton" aria-hidden="true">
                        <span class="listing-aside__skeleton-img" />
                        <span class="listing-aside__skeleton-line listing-aside__skeleton-line--short" />
                        <span class="listing-aside__skeleton-line" />
                        <span class="listing-aside__skeleton-line listing-aside__skeleton-line--mid" />
                    </div>
                )}
            </section>
        );
    }

    renderPublished(listing: Listing) {
        const onModeration = listing.status === 'moderation';
        const cover = listing.photos[0];

        return (
            <div class="listing-form-page listing-form-page--done">
                <section class="listing-done">
                    <span class="listing-done__icon" aria-hidden="true">✓</span>
                    <h1 class="listing-done__title">
                        {onModeration ? 'Объявление отправлено на проверку' : 'Объявление опубликовано'}
                    </h1>
                    <p class="listing-done__text">
                        {onModeration
                            ? 'Обычно проверка занимает до 30 минут. Как только она пройдёт, объявление появится в поиске.'
                            : 'Объявление уже в поиске — покупатели могут его найти.'}
                    </p>
                    <div class="listing-done__card">
                        <ProductCard
                            id={listing.id}
                            link={false}
                            title={listing.title}
                            price={listing.price ?? '0'}
                            is_free={listing.is_free}
                            image_url={cover?.thumb_url ?? null}
                            city={listing.city}
                            has_delivery={listing.has_delivery}
                            created_at={listing.created_at}
                            meta={`${listing.city} · размещено сегодня`}
                        />
                    </div>
                    <div class="listing-done__actions">
                        <a href={`/listing/${listing.id}`} data-link class="listing-done__primary">Перейти к объявлению</a>
                        <Button text="Разместить ещё" variant="secondary" onClick={this.handleCreateAnother} />
                    </div>
                </section>
            </div>
        );
    }

    render() {
        const { values, errors, photos, summary, formError, submitting, published } = this.state;
        if (published) return this.renderPublished(published);

        const { listing } = this.props;
        const uploading = photos.some((p) => p.uploading);
        const title = this.isEdit ? 'Редактирование объявления' : 'Новое объявление';
        const titleLength = values.title.length;

        return (
            <div class="listing-form-page">
                <nav class="breadcrumbs" aria-label="Хлебные крошки">
                    <a href="/" data-link>Главная</a>
                    <span class="breadcrumbs__sep" aria-hidden="true">/</span>
                    {listing
                        ? <a href={`/listing/${listing.id}`} data-link>{listing.title || 'Объявление'}</a>
                        : <span class="breadcrumbs__current">{title}</span>}
                </nav>

                <div class="listing-form-page__layout">
                    <form class="listing-form" novalidate onSubmit={this.handleSubmit}>
                        <h1 class="listing-form-page__title">{title}</h1>

                        {summary && <p class="listing-form__summary" role="alert">{summary}</p>}

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Категория</h2>
                            {this.renderCategory()}
                        </section>

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Название</h2>
                            <FormField
                                id="listing-title"
                                name="title"
                                label="Название объявления *"
                                placeholder={'Например, велосипед горный Stels 26"'}
                                value={values.title}
                                hint={titleLength
                                    ? `${titleLength} / ${TITLE_MAX} символов`
                                    : `Коротко: что это и в каком состоянии. До ${TITLE_MAX} символов`}
                                error={errors.title}
                                onInput={this.handleText}
                            />
                        </section>

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Фотографии</h2>
                            <p class="listing-form__section-hint">
                                До {PHOTOS_MAX} фото. Первое будет на обложке — перетащите, чтобы поменять порядок
                            </p>
                            <PhotoUploader
                                photos={photos}
                                max={PHOTOS_MAX}
                                error={errors.photos}
                                onAdd={this.handleAddPhotos}
                                onRemove={this.handleRemovePhoto}
                                onMove={this.handleMovePhoto}
                            />
                        </section>

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Описание</h2>
                            {this.renderDescription()}
                        </section>

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Цена и состояние</h2>
                            <div class="listing-form__price-row">
                                <div class="listing-form__price">
                                    <FormField
                                        id="listing-price"
                                        name="price"
                                        label="Цена, ₽ *"
                                        placeholder={values.is_free ? 'Даром' : '0'}
                                        inputmode="decimal"
                                        value={values.price}
                                        error={errors.price}
                                        onInput={this.handleText}
                                        onChange={this.handlePriceChange}
                                    />
                                </div>
                                <div class="listing-form__flags">
                                    {!values.is_free && this.renderCheckbox('is_negotiable', 'Торг уместен')}
                                    {this.renderCheckbox('is_free', 'Отдам даром')}
                                </div>
                            </div>
                            {this.renderCondition()}
                        </section>

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Где и как получить</h2>
                            <FormField
                                id="listing-address"
                                name="address"
                                label="Адрес или метро"
                                placeholder="Москва, м. Сокол"
                                autocomplete="street-address"
                                value={values.address}
                                error={errors.address}
                                onInput={this.handleText}
                            />
                            {this.renderCheckbox(
                                'has_delivery',
                                'Отправлю через GoGET Доставку',
                                'Покупатель оплатит доставку, деньги придут вам после получения',
                            )}
                        </section>

                        {formError && <p class="listing-form__error" role="alert">{formError}</p>}

                        <div class="listing-form__actions">
                            {this.isEdit ? [
                                <Button type="submit" text={submitting ? 'Сохраняем…' : 'Сохранить изменения'} disabled={submitting || uploading} />,
                                <a href={`/listing/${listing!.id}`} data-link class="listing-form__cancel">Отмена</a>,
                            ] : [
                                <Button type="submit" text={submitting ? 'Публикуем…' : 'Опубликовать'} disabled={submitting || uploading} />,
                                <Button
                                    text="Сохранить черновик"
                                    variant="outline"
                                    disabled={submitting || uploading}
                                    onClick={() => this.submit(true)}
                                />,
                                <p class="listing-form__terms">
                                    Нажимая «Опубликовать», вы соглашаетесь с{' '}
                                    <a href="/terms" data-link>правилами размещения</a>
                                </p>,
                            ]}
                        </div>
                    </form>

                    <aside class="listing-aside">
                        {this.renderPreview()}
                        <section class="listing-aside__card">
                            <h2 class="listing-aside__tips-title">Как продать быстрее</h2>
                            <ul class="listing-aside__tips">
                                {TIPS.map((tip) => <li key={tip}>{tip}</li>)}
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        );
    }
}
