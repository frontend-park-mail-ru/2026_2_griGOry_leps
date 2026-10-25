import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@/vdom';
import { ApiError, type Address, type Profile } from '@/lib/api';
import { AddressesPage } from './addresses-page';

const api = vi.hoisted(() => ({
    getAddresses: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    getMyListingsCount: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api')>()),
    ...api,
}));

const profile: Profile = {
    id: 7,
    email: 'ivan@example.com',
    first_name: 'Иван',
    phone: '+79990000000',
    phone_verified: true,
    city: { id: 1, name: 'Москва' },
    about: '',
    avatar_url: null,
    rating: 0,
    reviews_count: 0,
    created_at: '2024-03-05T10:00:00Z',
};

const home: Address = { id: 1, street: 'Москва, ул. Тверская', house: 'д. 12, кв. 34', comment: 'Домофон 34', is_default: true };
const work: Address = { id: 2, street: 'Москва, Ленинский пр.', house: 'д. 1', comment: '', is_default: false };

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: HTMLElement;

function renderPage() {
    render(root, <AddressesPage profile={profile} onLogout={async () => {}} />);
}

function query<T extends HTMLElement>(selector: string): T {
    const el = root.querySelector<T>(selector);
    expect(el).not.toBeNull();
    return el!;
}

function type(selector: string, value: string) {
    const input = query<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function submit() {
    query<HTMLButtonElement>('.addresses__save').click();
    await tick();
}

beforeEach(() => {
    vi.clearAllMocks();
    api.getAddresses.mockResolvedValue([home, work]);
    api.getMyListingsCount.mockResolvedValue(0);
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
});

describe('AddressesPage', () => {
    it('показывает адреса и открывает основной для редактирования', async () => {
        renderPage();
        await tick();

        expect(root.querySelectorAll('.addresses__option')).toHaveLength(2);
        expect(query('.addresses__option--selected').dataset.addressId).toBe('1');
        expect(query('[data-address-id="1"] .addresses__option-description').textContent).toBe('д. 12, кв. 34 · основной');
        expect(query('.addresses__form-title').textContent).toBe('Изменить адрес');
        expect(query<HTMLInputElement>('#address-street').value).toBe('Москва, ул. Тверская');
        expect(query('.addresses__counter').textContent).toBe('10 / 200');
        expect(query('.profile-sidebar__menu-item--active').textContent).toBe('Адреса доставки');
        expect(query('.profile-sidebar__menu-count').textContent).toBe('0');
    });

    it('переключает адрес по клику на карточку', async () => {
        renderPage();
        await tick();

        const radio = query<HTMLInputElement>('[data-address-id="2"] .addresses__radio');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();

        expect(query('.addresses__option--selected').dataset.addressId).toBe('2');
        expect(query<HTMLInputElement>('#address-house').value).toBe('д. 1');
        expect(query<HTMLInputElement>('.addresses__checkbox').checked).toBe(false);
    });

    it('без адресов сразу открывает форму нового адреса', async () => {
        api.getAddresses.mockResolvedValue([]);
        renderPage();
        await tick();

        expect(root.querySelectorAll('.addresses__option')).toHaveLength(0);
        expect(query('.addresses__form-title').textContent).toBe('Новый адрес');
        expect(root.querySelector('.addresses__delete')).toBeNull();
        expect(root.querySelector('.addresses__checkbox')).toBeNull();
    });

    it('добавляет новый адрес', async () => {
        const created: Address = { id: 3, street: 'Казань, ул. Баумана', house: 'д. 5', comment: '', is_default: false };
        api.createAddress.mockResolvedValue(created);
        renderPage();
        await tick();

        query<HTMLButtonElement>('.addresses__add').click();
        await tick();
        expect(query('.addresses__form-title').textContent).toBe('Новый адрес');

        type('#address-street', '  Казань, ул. Баумана ');
        type('#address-house', 'д. 5');
        await submit();

        expect(api.createAddress).toHaveBeenCalledWith({
            street: 'Казань, ул. Баумана',
            house: 'д. 5',
            comment: '',
            is_default: false,
        });
        expect(root.querySelectorAll('.addresses__option')).toHaveLength(3);
        expect(query('.addresses__option--selected').dataset.addressId).toBe('3');
        expect(query('.toast--success .toast__message').textContent).toBe('Адрес сохранён');
    });

    it('делает адрес основным', async () => {
        api.updateAddress.mockResolvedValue({ ...work, is_default: true });
        renderPage();
        await tick();

        const radio = query<HTMLInputElement>('[data-address-id="2"] .addresses__radio');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();

        const checkbox = query<HTMLInputElement>('.addresses__checkbox');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        await submit();

        expect(api.updateAddress).toHaveBeenCalledWith(2, expect.objectContaining({ is_default: true }));
        expect(query('[data-address-id="2"] .addresses__option-description').textContent).toBe('д. 1 · основной');
        expect(query('[data-address-id="1"] .addresses__option-description').textContent).toBe('д. 12, кв. 34');
    });

    it('не отправляет пустую форму', async () => {
        api.getAddresses.mockResolvedValue([]);
        renderPage();
        await tick();

        await submit();

        expect(api.createAddress).not.toHaveBeenCalled();
        expect(query('[data-error-for="street"]').textContent).toBe('Укажите город и улицу');
        expect(query('[data-error-for="house"]').textContent).toBe('Укажите дом и квартиру');
    });

    it('показывает уведомление, если сервер не сохранил адрес', async () => {
        api.updateAddress.mockRejectedValue(new ApiError(500));
        renderPage();
        await tick();

        await submit();

        expect(query('.toast--error .toast__message').textContent).toBe('Не удалось сохранить адрес. Попробуйте ещё раз');
    });

    it('удаляет адрес после подтверждения', async () => {
        api.deleteAddress.mockResolvedValue(undefined);
        renderPage();
        await tick();

        query<HTMLButtonElement>('.addresses__delete').click();
        await tick();
        query<HTMLButtonElement>('.addresses__delete-confirm').click();
        await tick();

        expect(api.deleteAddress).toHaveBeenCalledWith(1);
        expect(root.querySelector('.modal')).toBeNull();
        expect(root.querySelectorAll('.addresses__option')).toHaveLength(1);
        expect(query('.addresses__option--selected').dataset.addressId).toBe('2');
        expect(query('.toast--success .toast__message').textContent).toBe('Адрес удалён');
    });

    it('при ошибке загрузки показывает ошибку с повтором', async () => {
        api.getAddresses.mockRejectedValueOnce(new ApiError(500));
        renderPage();
        await tick();

        expect(root.querySelector('.page-error')).not.toBeNull();

        query<HTMLButtonElement>('.page-error .empty-state__action').click();
        await tick();

        expect(root.querySelectorAll('.addresses__option')).toHaveLength(2);
    });
});
