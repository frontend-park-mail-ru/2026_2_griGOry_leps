import type { CategoryNode, CloseReason, Condition, ListingStatus } from '@/lib/api';

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 3000;
export const PHOTOS_MAX = 10;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png'];

export const CONDITION_LABELS: Record<Condition, string> = {
    new: 'Новое',
    used_good: 'Б/у — как новое',
    used_repair: 'Б/у — есть следы использования',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
    draft: 'Черновик',
    moderation: 'На проверке',
    active: 'Активно',
    closed: 'Снято с продажи',
    sold: 'Продано',
};

export const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
    sold_on_goget: 'Продал на GoGET',
    sold_elsewhere: 'Продал в другом месте',
    changed_mind: 'Передумал продавать',
    other: 'Другая причина',
};

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
