import { Component } from 'goget-vdom';
import { Button } from '@/components/button/button';
import { type CategoryNode, type SearchFilters } from '@/lib/api';
import { categoryPath } from '@/lib/listings';
import { validatePrices } from './search-price';

const deliveryOptions = [
    { label: 'Любая', value: undefined },
    { label: 'С доставкой', value: true },
    { label: 'Без доставки', value: false },
];

interface DrawerProps {
    filters: SearchFilters;
    categories: CategoryNode[];
    status: 'loading' | 'ready' | 'error';
    onRetry: () => void;
    onClose: () => void;
    onApply: (filters: SearchFilters) => void;
}

export class FilterDrawer extends Component<DrawerProps, { draft: SearchFilters }> {
    state = { draft: { ...this.props.filters } };

    private dialog: HTMLDialogElement | null = null;

    private setDialog = (el: HTMLElement | null) => {
        this.dialog = el as HTMLDialogElement | null;
    };

    private closeOnHistoryChange = () => this.props.onClose();

    componentDidMount() {
        this.dialog?.showModal();
        document.body.classList.add('body--modal-open');
        window.addEventListener('popstate', this.closeOnHistoryChange);
    }

    componentWillUnmount() {
        window.removeEventListener('popstate', this.closeOnHistoryChange);
        this.dialog?.close();
        document.body.classList.remove('body--modal-open');
    }

    update = (patch: Partial<SearchFilters>) => {
        this.setState(({ draft }) => ({ draft: { ...draft, ...patch } }));
    };

    handleInput = (field: 'city' | 'price_min' | 'price_max') => (event: Event) => {
        const input = event.currentTarget as HTMLInputElement;
        const value = field === 'city' ? input.value : input.value.replace(',', '.');
        this.update({ [field]: value });
    };

    render() {
        const { categories, status, onClose, onApply, onRetry } = this.props;
        const { draft } = this.state;
        const { priceMinError, priceMaxError } = validatePrices(draft.price_min, draft.price_max);
        const path = categoryPath(categories, draft.category_id ?? 0);
        const levels = [categories, ...path.map(node => node.children)]
            .filter(nodes => nodes.length);

        return (
            <dialog
                class="filter-drawer"
                ref={this.setDialog}
                aria-labelledby="filter-heading"
                onCancel={(event: Event) => {
                    event.preventDefault();
                    onClose();
                }}
                onClick={(event: MouseEvent) => {
                    if (event.target === event.currentTarget) onClose();
                }}
            >
                <form
                    class="filter-drawer__form"
                    onSubmit={(event: Event) => {
                        event.preventDefault();
                        if (priceMinError || priceMaxError) return;
                        onApply({ ...draft, city: draft.city?.trim() });
                    }}
                >
                    <div class="filter-drawer__head">
                        <h2 class="filter-drawer__title" id="filter-heading">Фильтры</h2>
                        <button
                            type="button"
                            class="filter-drawer__close"
                            aria-label="Закрыть"
                            onClick={onClose}
                        >×</button>
                    </div>

                    <div class="filter-drawer__body">
                        <fieldset class="filter-drawer__group">
                            <legend class="filter-drawer__legend">Категория</legend>

                            <label class="filter-drawer__choice">
                                <input
                                    class="filter-drawer__check"
                                    type="radio"
                                    name="category"
                                    checked={!draft.category_id}
                                    onChange={() => this.update({ category_id: undefined })}
                                />
                                Все категории
                            </label>

                            {levels.map(nodes => (
                                <div key={nodes[0].id} class="filter-drawer__choices">
                                    {nodes.map(node => (
                                        <label key={node.id} class="filter-drawer__choice">
                                            <input
                                                class="filter-drawer__check"
                                                type="radio"
                                                name="category"
                                                checked={draft.category_id === node.id}
                                                onChange={() => this.update({ category_id: node.id })}
                                            />
                                            {node.name}
                                        </label>
                                    ))}
                                </div>
                            ))}

                            {status === 'loading' && <p>Загружаем категории…</p>}

                            {status === 'error' && (
                                <div>
                                    Не удалось загрузить категории.{' '}
                                    <button
                                        type="button"
                                        class="search-filters__reset"
                                        onClick={onRetry}
                                    >Повторить</button>
                                </div>
                            )}
                        </fieldset>

                        <fieldset class="filter-drawer__group">
                            <legend class="filter-drawer__legend">Цена, ₽</legend>

                            <div class="filter-drawer__prices">
                                <input
                                    class="filter-drawer__input"
                                    type="text"
                                    inputmode="decimal"
                                    name="price_min"
                                    aria-label="Цена от"
                                    aria-invalid={priceMinError ? 'true' : undefined}
                                    aria-describedby={priceMinError ? 'price-min-error' : undefined}
                                    placeholder="от"
                                    value={draft.price_min ?? ''}
                                    onInput={this.handleInput('price_min')}
                                />
                                <input
                                    class="filter-drawer__input"
                                    type="text"
                                    inputmode="decimal"
                                    name="price_max"
                                    aria-label="Цена до"
                                    aria-invalid={priceMaxError ? 'true' : undefined}
                                    aria-describedby={priceMaxError ? 'price-max-error' : undefined}
                                    placeholder="до"
                                    value={draft.price_max ?? ''}
                                    onInput={this.handleInput('price_max')}
                                />
                            </div>

                            {priceMinError && (
                                <p id="price-min-error" class="filter-drawer__error" role="alert">
                                    {priceMinError}
                                </p>
                            )}
                            {priceMaxError && (
                                <p id="price-max-error" class="filter-drawer__error" role="alert">
                                    {priceMaxError}
                                </p>
                            )}
                        </fieldset>

                        <label class="filter-drawer__group">
                            <span class="filter-drawer__legend">Город</span>
                            <input
                                class="filter-drawer__input"
                                name="city"
                                placeholder="Любой город"
                                value={draft.city ?? ''}
                                onInput={this.handleInput('city')}
                            />
                        </label>

                        <fieldset class="filter-drawer__group">
                            <legend class="filter-drawer__legend">Доставка</legend>
                            {deliveryOptions.map(option => (
                                <label key={option.label} class="filter-drawer__choice">
                                    <input
                                        class="filter-drawer__check"
                                        type="radio"
                                        name="has_delivery"
                                        checked={draft.has_delivery === option.value}
                                        onChange={() => this.update({ has_delivery: option.value })}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </fieldset>
                    </div>

                    <div class="filter-drawer__actions">
                        <Button
                            variant="secondary"
                            text="Сбросить"
                            onClick={() => this.setState({ draft: { sort: draft.sort } })}
                        />
                        <Button type="submit" text="Показать объявления" />
                    </div>
                </form>
            </dialog>
        );
    }
}
