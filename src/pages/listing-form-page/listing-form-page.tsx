import { Component } from '@/vdom';
import './listing-form-page.scss';

import { Breadcrumbs } from '@/components/breadcrumbs/breadcrumbs';
import { Button } from '@/components/button/button';
import { CategorySelect } from '@/components/category-select/category-select';
import { CheckboxField } from '@/components/checkbox-field/checkbox-field';
import { ConditionField } from '@/components/condition-field/condition-field';
import { DescriptionField } from '@/components/description-field/description-field';
import { FormField } from '@/components/form-field/form-field';
import { ListingPreview } from '@/components/listing-preview/listing-preview';
import { ListingPublished } from '@/components/listing-published/listing-published';
import { PhotoUploader, type PhotoItem } from '@/components/photo-uploader/photo-uploader';
import { SellingTips } from '@/components/selling-tips/selling-tips';
import {
    ApiError, assetUrl, createListing, updateListing, uploadListingPhoto, type CategoryNode, type Listing,
} from '@/lib/api';
import {
    PHOTOS_MAX, PHOTO_MAX_BYTES, PHOTO_TYPES, SERVER_FIELDS, SERVER_MESSAGES, TITLE_MAX,
    buildCreateData, buildUpdateData, initialValues, normalizePrice, photoError, sanitizePrice, saveErrorText, summaryText, validateListing,
    type ListingFormErrors, type ListingFormValues,
} from '@/lib/listing-form';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { navigate } from '@/router/router';

export interface ListingFormPageProps {
    categories: CategoryNode[];
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

let photoKey = 0;

export class ListingFormPage extends Component<ListingFormPageProps, ListingFormState> {
    submitted = false;
    savingDraft = false;
    blobUrls = new Set<string>();

    constructor(props: ListingFormPageProps) {
        super(props);
        this.state = {
            values: initialValues(props.listing),
            photos: (props.listing?.photos ?? []).map((photo) => ({
                key: `p${++photoKey}`,
                id: photo.id,
                preview: assetUrl(photo.thumb_url) ?? '',
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
            const errors = validateListing(next, this.readyPhotos(photos).length, this.savingDraft);
            patch.errors = errors;
            if (this.state.summary) patch.summary = summaryText(Object.keys(errors).length);
        }
        this.setState(patch);
    }

    readyPhotos(photos = this.state.photos): number[] {
        return photos.filter((p) => p.id !== null && !p.uploading && !p.error).map((p) => p.id as number);
    }

    setField = <K extends keyof ListingFormValues>(name: K) => (value: ListingFormValues[K]) => {
        this.update({ [name]: value } as Partial<ListingFormValues>);
    };

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement;
        this.update({ [input.name]: input.value });
    };

    handlePriceInput = (e: Event) => {
        const input = e.target as HTMLInputElement;
        input.value = sanitizePrice(input.value);
        this.update({ price: input.value });
    };

    handlePriceChange = () => {
        this.update({ price: normalizePrice(this.state.values.price) });
    };

    handleFree = (isFree: boolean) => {
        this.update(isFree ? { is_free: true, price: '', is_negotiable: false } : { is_free: false });
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
            patch = { id: uploaded.id, preview: assetUrl(uploaded.thumb_url) ?? '', uploading: false };
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

    submit = async (asDraft: boolean) => {
        this.submitted = true;
        this.savingDraft = asDraft;
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

        const errors = validateListing(values, this.readyPhotos().length, asDraft);
        const count = Object.keys(errors).length;
        this.setState({ errors, summary: asDraft ? '' : summaryText(count) });
        if (count) {
            this.focusFirstError();
            return;
        }

        this.setState({ submitting: true });
        try {
            await this.save(asDraft);
        } catch (err) {
            logWarn('Не удалось сохранить объявление:', err);
            this.setState({ submitting: false });
            this.showServerError(err);
        }
    };

    async save(asDraft: boolean) {
        const { values } = this.state;
        const { listing } = this.props;
        const photoIds = this.readyPhotos();

        if (listing && (asDraft || !this.isDraft)) {
            await updateListing(listing.id, buildUpdateData(values, photoIds));
            showToast(asDraft ? 'Черновик сохранён' : 'Изменения сохранены');
            navigate(`/listing/${listing.id}`);
            return;
        }

        if (!listing && asDraft) {
            const saved = await createListing(buildCreateData(values, photoIds, true));
            showToast('Черновик сохранён');
            navigate(`/listing/${saved.id}`);
            return;
        }

        const saved = listing
            ? await updateListing(listing.id, buildUpdateData(values, photoIds, true))
            : await createListing(buildCreateData(values, photoIds, false));
        this.setState({ published: saved, submitting: false });
        window.scrollTo(0, 0);
    }

    showServerError(err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
            navigate('/login');
            return;
        }

        const field = err instanceof ApiError && err.status === 400 ? SERVER_FIELDS[err.field] : undefined;
        if (field) {
            this.setState({ errors: { ...this.state.errors, [field]: SERVER_MESSAGES[field] } });
            this.focusFirstError();
            return;
        }

        this.setState({ formError: saveErrorText(err) });
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
        if (this.isEdit) {
            navigate('/listing/new');
            return;
        }
        this.submitted = false;
        this.savingDraft = false;
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

    renderActions() {
        const { photos, submitting } = this.state;
        const { listing } = this.props;
        const disabled = submitting || photos.some((p) => p.uploading);

        if (listing && !this.isDraft) {
            return [
                <Button type="submit" text={submitting ? 'Сохраняем…' : 'Сохранить изменения'} disabled={disabled} />,
                <a href={`/listing/${listing.id}`} data-link class="listing-form__cancel">Отмена</a>,
            ];
        }

        return [
            <Button type="submit" text={submitting ? 'Публикуем…' : 'Опубликовать'} disabled={disabled} />,
            <Button text="Сохранить черновик" variant="outline" disabled={disabled} onClick={() => this.submit(true)} />,
            <p class="listing-form__terms">
                Нажимая «Опубликовать», вы соглашаетесь с{' '}
                <a class="listing-form__terms-link" href="/terms" data-link>правилами размещения</a>
            </p>,
        ];
    }

    render() {
        const { values, errors, photos, summary, formError, published } = this.state;

        if (published) {
            return (
                <div class="listing-form-page listing-form-page--done">
                    <ListingPublished listing={published} onCreateAnother={this.handleCreateAnother} />
                </div>
            );
        }

        const { listing, categories } = this.props;
        let title = 'Новое объявление';
        if (this.isEdit) title = this.isDraft ? 'Редактирование черновика' : 'Редактирование объявления';
        const titleLength = values.title.length;
        const cover = photos.find((p) => !p.error)?.preview ?? null;

        return (
            <div class="listing-form-page">
                <Breadcrumbs
                    items={[
                        { label: 'Главная', href: '/' },
                        ...(listing ? [{ label: listing.title || 'Объявление', href: `/listing/${listing.id}` }] : []),
                        { label: title },
                    ]}
                />

                <div class="listing-form-page__layout">
                    <form class="listing-form" novalidate onSubmit={this.handleSubmit}>
                        <h1 class="listing-form-page__title">{title}</h1>

                        {summary && <p class="listing-form__summary" role="alert">{summary}</p>}

                        <section class="listing-form__section">
                            <h2 class="listing-form__section-title">Категория</h2>
                            <CategorySelect
                                categories={categories}
                                value={values.category_id}
                                error={errors.category_id}
                                onChange={this.setField('category_id')}
                            />
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
                                onInput={this.handleInput}
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
                            <DescriptionField
                                value={values.description}
                                error={errors.description}
                                onChange={this.setField('description')}
                            />
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
                                        onInput={this.handlePriceInput}
                                        onChange={this.handlePriceChange}
                                    />
                                </div>
                                <div class="listing-form__flags">
                                    {!values.is_free && (
                                        <CheckboxField
                                            name="is_negotiable"
                                            label="Торг уместен"
                                            value={values.is_negotiable}
                                            onChange={this.setField('is_negotiable')}
                                        />
                                    )}
                                    <CheckboxField name="is_free" label="Отдам даром" value={values.is_free} onChange={this.handleFree} />
                                </div>
                            </div>
                            <ConditionField
                                value={values.condition}
                                error={errors.condition}
                                onChange={this.setField('condition')}
                            />
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
                                onInput={this.handleInput}
                            />
                            <CheckboxField
                                name="has_delivery"
                                label="Отправлю через GoGET Доставку"
                                hint="Покупатель оплатит доставку, деньги придут вам после получения"
                                value={values.has_delivery}
                                onChange={this.setField('has_delivery')}
                            />
                        </section>

                        {formError && <p class="listing-form__error" role="alert">{formError}</p>}

                        <div class="listing-form__actions">{this.renderActions()}</div>
                    </form>

                    <aside class="listing-form-page__aside">
                        <ListingPreview values={values} cover={cover} />
                        <SellingTips />
                    </aside>
                </div>
            </div>
        );
    }
}
