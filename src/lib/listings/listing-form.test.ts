import { describe, it, expect } from 'vitest';
import {
    buildCreateData, buildUpdateData, categoryPath, deliveryAllowed, initialValues, normalizePrice, sanitizePrice, summaryText, validateListing,
    type ListingFormValues,
} from './listing-form';

const filled: ListingFormValues = {
    category_id: '12',
    title: 'Велосипед',
    description: '',
    price: '15000',
    is_free: false,
    is_negotiable: false,
    condition: 'used_good',
    address: 'м. Сокол',
    has_delivery: false,
};

describe('цена', () => {
    it('оставляет только цифры и один разделитель, запятая становится точкой', () => {
        expect(sanitizePrice('13 500,5')).toBe('13500.5');
        expect(sanitizePrice('1a2b3')).toBe('123');
        expect(sanitizePrice('10.999')).toBe('10.99');
        expect(sanitizePrice('1.2.3')).toBe('1.23');
        expect(sanitizePrice('12345678901')).toBe('1234567890');
    });

    it('убирает точку в конце', () => {
        expect(normalizePrice('1500.')).toBe('1500');
        expect(normalizePrice('1500.5')).toBe('1500.5');
    });
});

describe('validateListing', () => {
    it('заполненная форма проходит', () => {
        expect(validateListing(filled, 1, false)).toEqual({});
    });

    it('при публикации требует категорию, фото, цену, состояние и адрес', () => {
        const empty = { ...filled, category_id: '', title: '', price: '', condition: '' as const, address: ' ' };
        expect(Object.keys(validateListing(empty, 0, false)).sort())
            .toEqual(['address', 'category_id', 'condition', 'photos', 'price', 'title']);
    });

    it('«Отдам бесплатно» снимает требование цены', () => {
        expect(validateListing({ ...filled, price: '', is_free: true }, 1, false)).toEqual({});
    });

    it('черновику нужно только название, но заполненные поля проверяются', () => {
        const draft = { ...filled, category_id: '', price: '', condition: '' as const, address: '' };
        expect(validateListing(draft, 0, true)).toEqual({});
        expect(validateListing({ ...draft, title: '' }, 0, true)).toHaveProperty('title');
        expect(validateListing({ ...draft, description: 'x'.repeat(3001) }, 0, true)).toHaveProperty('description');
    });

    it('название длиннее 80 символов не проходит', () => {
        expect(validateListing({ ...filled, title: 'x'.repeat(81) }, 1, false)).toHaveProperty('title');
    });
});

describe('categoryPath', () => {
    const tree = [
        { id: 1, name: 'Спорт', slug: 's', delivery_allowed: true, children: [
            { id: 12, name: 'Велосипеды', slug: 'b', delivery_allowed: true, children: [] },
            { id: 13, name: 'Самокаты', slug: 'k', delivery_allowed: true, children: [
                { id: 131, name: 'Электрические', slug: 'e', delivery_allowed: true, children: [] },
            ] },
        ] },
        { id: 3, name: 'Отдам даром', slug: 'f', delivery_allowed: true, children: [] },
    ];

    it('находит путь от корня до листа', () => {
        expect(categoryPath(tree, 131).map((node) => node.id)).toEqual([1, 13, 131]);
        expect(categoryPath(tree, 3).map((node) => node.id)).toEqual([3]);
    });

    it('для неизвестной категории пусто', () => {
        expect(categoryPath(tree, 99)).toEqual([]);
    });

    it('доставку решает выбранная категория, без категории она разрешена', () => {
        const realty = [...tree, { id: 4, name: 'Недвижимость', slug: 'r', delivery_allowed: false, children: [] }];
        expect(deliveryAllowed(realty, '4')).toBe(false);
        expect(deliveryAllowed(realty, '12')).toBe(true);
        expect(deliveryAllowed(realty, '')).toBe(true);
    });
});

describe('summaryText', () => {
    it('склоняет число полей', () => {
        expect(summaryText(0)).toBe('');
        expect(summaryText(1)).toContain('1 обязательное поле, оно отмечено');
        expect(summaryText(4)).toContain('4 обязательных поля, они отмечены');
        expect(summaryText(6)).toContain('6 обязательных полей');
    });
});

describe('buildCreateData', () => {
    it('публикация отправляет все поля, бесплатное — без цены и торга', () => {
        expect(buildCreateData({ ...filled, is_free: true, is_negotiable: true }, [5], false)).toEqual({
            category_id: 12, title: 'Велосипед', description: '', photo_ids: [5], is_free: true,
            is_negotiable: false, condition: 'used_good', address: 'м. Сокол', has_delivery: false, publish: true,
        });
    });

    it('новый черновик отправляет только заполненное', () => {
        const draft = { ...initialValues(), title: ' Гитара ' };
        expect(buildCreateData(draft, [], true)).toEqual({
            title: 'Гитара', is_free: false, is_negotiable: false, has_delivery: false, publish: false,
        });
    });
});

describe('buildUpdateData', () => {
    it('стёртые поля уходят как null, чтобы бэк их очистил', () => {
        const draft = { ...filled, category_id: '', price: '', condition: '' as const, address: '  ', description: '' };
        expect(buildUpdateData(draft, [])).toEqual({
            category_id: null, title: 'Велосипед', photo_ids: [], description: '', is_free: false,
            is_negotiable: false, condition: null, address: null, has_delivery: false, price: null,
        });
    });

    it('у бесплатного цену не отправляет, а publish добавляет только при публикации', () => {
        const data = buildUpdateData({ ...filled, is_free: true, price: '' }, [5], true);
        expect(data).not.toHaveProperty('price');
        expect(data.publish).toBe(true);
        expect(buildUpdateData(filled, [5])).not.toHaveProperty('publish');
    });
});
