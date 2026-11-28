import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render } from 'goget-vdom';
import { navigate } from 'goget-router';
import type { SearchButtonColor } from '@/lib/api';
import { Header } from './header';

vi.mock('goget-router', async (orig) => ({
    ...await orig<typeof import('goget-router')>(),
    navigate: vi.fn(),
}));

let root: HTMLElement;
beforeEach(() => {
    root = document.createElement('div');
    history.replaceState(null, '', '/');
    vi.mocked(navigate).mockClear();
});
afterEach(() => render(root, null));

function renderHeader(maxQueryLength: number | null, searchButtonColor: SearchButtonColor = 'blue') {
    render(root, <Header user={null} cartCount={0} onLogout={async () => {}}
        maxQueryLength={maxQueryLength} searchButtonColor={searchButtonColor} />);
}
function type(text: string) {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
}
function submit() {
    root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

const error = () => root.querySelector('#header-search-error');
const input = () => root.querySelector<HTMLInputElement>('input[name="q"]')!;

it('меняет цвет существующей кнопки и сохраняет введённый запрос', async () => {
    renderHeader(null);
    const button = root.querySelector('button[aria-label="Найти"]')!;
    type('телефон');
    await vi.waitFor(() => expect(input().value).toBe('телефон'));
    expect(button.classList.contains('search__btn--orange')).toBe(false);

    renderHeader(null, 'orange');
    expect(root.querySelector('button[aria-label="Найти"]')).toBe(button);
    expect(button.classList.contains('search__btn--orange')).toBe(true);
    expect(input().value).toBe('телефон');

    renderHeader(null);
    expect(button.classList.contains('search__btn--orange')).toBe(false);
});

it('ровно N символов — без ошибки и с переходом, N + 1 — ошибка без перехода', async () => {
    renderHeader(3);
    type('абв');
    submit();
    expect(error()).toBeNull();
    expect(navigate).toHaveBeenLastCalledWith('/search?q=%D0%B0%D0%B1%D0%B2');

    vi.mocked(navigate).mockClear();
    type('абвг');
    await vi.waitFor(() => expect(error()?.textContent).toBe('Сократите запрос до 3 символов'));
    expect(error()?.getAttribute('role')).toBe('alert');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('header-search-error');
    expect(input().hasAttribute('maxlength')).toBe(false);
    submit();
    expect(navigate).not.toHaveBeenCalled();

    type('аб');
    await vi.waitFor(() => expect(error()).toBeNull());
});

it('пробелы по краям и эмодзи не превышают лимит', async () => {
    renderHeader(3);
    type('  🚲аб  ');
    submit();
    expect(error()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);

    type('  🚲абв  ');
    await vi.waitFor(() => expect(error()).not.toBeNull());
});

it('без лимита — прежнее поведение', () => {
    renderHeader(null);
    type('а'.repeat(500));
    submit();
    expect(error()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
});

it('смена лимита обновляет ошибку', async () => {
    renderHeader(10);
    type('абвгд');
    expect(error()).toBeNull();
    renderHeader(3);
    await vi.waitFor(() => expect(error()).not.toBeNull());
});

it('длинный q из URL на /search сразу показывает ошибку', async () => {
    history.replaceState(null, '', '/search?q=абвгд');
    renderHeader(3);
    await vi.waitFor(() => expect(error()?.textContent).toBe('Сократите запрос до 3 символов'));
});
