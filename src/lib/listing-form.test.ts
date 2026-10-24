import { describe, it, expect } from 'vitest';
import {
    buildListingData, categoryGroups, initialValues, normalizePrice, sanitizePrice, summaryText, validateListing,
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

describe('categoryGroups', () => {
    it('группирует листья по корню и пишет полный путь', () => {
        const groups = categoryGroups([
            { id: 1, name: 'Спорт', slug: 's', children: [
                { id: 12, name: 'Велосипеды', slug: 'b', children: [] },
                { id: 13, name: 'Самокаты', slug: 'k', children: [
                    { id: 131, name: 'Электрические', slug: 'e', children: [] },
                ] },
            ] },
            { id: 3, name: 'Отдам даром', slug: 'f', children: [] },
        ]);

        expect(groups).toEqual([
            { name: 'Спорт', options: [{ id: 12, label: 'Спорт → Велосипеды' }, { id: 131, label: 'Спорт → Самокаты → Электрические' }] },
            { name: 'Отдам даром', options: [{ id: 3, label: 'Отдам даром' }] },
        ]);
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

describe('buildListingData', () => {
    it('публикация отправляет все поля, бесплатное — без цены и торга', () => {
        expect(buildListingData({ ...filled, is_free: true, is_negotiable: true }, [5], false)).toEqual({
            category_id: 12, title: 'Велосипед', description: '', photo_ids: [5], is_free: true,
            is_negotiable: false, condition: 'used_good', address: 'м. Сокол', has_delivery: false,
        });
    });

    it('черновик отправляет только заполненное', () => {
        const draft = { ...initialValues(), title: ' Гитара ' };
        expect(buildListingData(draft, [], true)).toEqual({
            title: 'Гитара', is_free: false, is_negotiable: false, has_delivery: false,
        });
    });
});
