import {
    ApiError, type CategoryNode, type Condition, type CreateListingData, type Listing, type UpdateListingData,
} from '@/lib/api';
import { plural } from '@/lib/format';

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 3000;
export const PHOTOS_MAX = 10;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png'];

export interface ListingFormValues {
    category_id: string;
    title: string;
    description: string;
    price: string;
    is_free: boolean;
    is_negotiable: boolean;
    condition: Condition | '';
    address: string;
    has_delivery: boolean;
}

export type ListingFormErrors = Partial<Record<keyof ListingFormValues | 'photos', string>>;

/** Поле ошибки бэка → поле формы */
export const SERVER_FIELDS: Record<string, keyof ListingFormErrors> = {
    category_id: 'category_id',
    title: 'title',
    photo_ids: 'photos',
    description: 'description',
    price: 'price',
    condition: 'condition',
    address: 'address',
};

export const SERVER_MESSAGES: Partial<Record<keyof ListingFormErrors, string>> = {
    category_id: 'Выберите категорию из списка',
    title: `Название от 1 до ${TITLE_MAX} символов`,
    photos: 'Загрузите фото заново',
    description: `Описание не длиннее ${DESCRIPTION_MAX} символов`,
    price: 'Укажите цену в рублях',
    condition: 'Выберите состояние',
    address: 'Укажите адрес',
};

export function initialValues(listing?: Listing): ListingFormValues {
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

export function sanitizePrice(value: string): string {
    const cleaned = value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const [rub = '', ...rest] = cleaned.split('.');
    const kop = rest.join('').slice(0, 2);
    const rubles = rub.slice(0, 10);
    return cleaned.includes('.') ? `${rubles}.${kop}` : rubles;
}

/** "1500." → "1500" */
export function normalizePrice(value: string): string {
    return value.replace(/\.$/, '');
}

export function validateListing(values: ListingFormValues, photosCount: number, draft: boolean): ListingFormErrors {
    const errors: ListingFormErrors = {};
    const title = values.title.trim();
    const price = normalizePrice(values.price);

    if (!title) errors.title = 'Добавьте название';
    else if (title.length > TITLE_MAX) errors.title = `Не длиннее ${TITLE_MAX} символов`;

    if (values.description.length > DESCRIPTION_MAX) {
        errors.description = `Не длиннее ${DESCRIPTION_MAX} символов`;
    }

    if (price && !/^\d{1,10}(\.\d{1,2})?$/.test(price)) errors.price = 'Укажите цену в рублях';

    if (draft) return errors;

    if (!values.category_id) errors.category_id = 'Выберите категорию — так покупатели быстрее найдут товар';
    if (photosCount === 0) errors.photos = 'Добавьте хотя бы одно фото — объявления без фото почти не смотрят';
    if (!values.is_free && !price) errors.price = 'Укажите цену или отметьте «Отдам даром»';
    if (!values.condition) errors.condition = 'Выберите состояние';
    if (!values.address.trim()) errors.address = 'Укажите адрес';

    return errors;
}

export function summaryText(count: number): string {
    if (!count) return '';
    return `Не получилось опубликовать: заполните ${count} ${plural(count, ['обязательное поле', 'обязательных поля', 'обязательных полей'])}, `
        + `${count === 1 ? 'оно отмечено' : 'они отмечены'} красным`;
}

export function buildCreateData(values: ListingFormValues, photoIds: number[], draft: boolean): CreateListingData {
    const data: CreateListingData = {
        title: values.title.trim(),
        description: values.description.trim(),
        is_free: values.is_free,
        is_negotiable: values.is_free ? false : values.is_negotiable,
        has_delivery: values.has_delivery,
        publish: !draft,
    };

    if (values.category_id) data.category_id = Number(values.category_id);
    if (values.condition) data.condition = values.condition;
    if (values.address.trim()) data.address = values.address.trim();
    if (!values.is_free && values.price) data.price = normalizePrice(values.price);
    if (photoIds.length || !draft) data.photo_ids = photoIds;
    if (draft && !data.description) delete data.description;

    return data;
}

export function buildUpdateData(values: ListingFormValues, photoIds: number[], publish = false): UpdateListingData {
    const address = values.address.trim();
    const data: UpdateListingData = {
        category_id: values.category_id ? Number(values.category_id) : null,
        title: values.title.trim(),
        photo_ids: photoIds,
        description: values.description.trim(),
        is_free: values.is_free,
        is_negotiable: values.is_free ? false : values.is_negotiable,
        condition: values.condition || null,
        address: address || null,
        has_delivery: values.has_delivery,
    };

    if (!values.is_free) data.price = values.price ? normalizePrice(values.price) : null;
    if (publish) data.publish = true;

    return data;
}

export function photoError(err: unknown): string {
    if (!(err instanceof ApiError)) return 'Не загрузилось';
    if (err.status === 413) return 'Больше 5 МБ';
    if (err.status === 415) return 'Только JPG или PNG';
    if (err.status === 400) return 'Файл повреждён';
    if (err.network || err.timeout) return 'Нет связи с сервером';
    return 'Не загрузилось';
}

export function saveErrorText(err: unknown): string {
    if (!(err instanceof ApiError)) return 'Не удалось сохранить объявление. Попробуйте ещё раз';
    if (err.network) return 'Нет соединения с сервером. Проверьте интернет';
    if (err.timeout) return 'Сервер не отвечает. Попробуйте ещё раз';
    if (err.status === 409 && err.reason === 'listing is not a draft') return 'Объявление уже опубликовано. Обновите страницу';
    if (err.status === 409) return 'Проданное объявление нельзя изменить';
    if (err.status === 403) return 'Это объявление нельзя редактировать';
    if (err.status === 404) return 'Объявление не найдено. Возможно, его удалили';
    return 'Не удалось сохранить объявление. Попробуйте ещё раз';
}

export interface CategoryOption {
    id: number;
    label: string;
}

export interface CategoryGroup {
    name: string;
    options: CategoryOption[];
}

export function categoryGroups(tree: CategoryNode[]): CategoryGroup[] {
    const leaves = (node: CategoryNode, path: string[]): CategoryOption[] => (
        node.children.length
            ? node.children.flatMap((child) => leaves(child, [...path, child.name]))
            : [{ id: node.id, label: path.join(' → ') }]
    );

    return tree.map((root) => ({
        name: root.name,
        options: leaves(root, [root.name]),
    }));
}
