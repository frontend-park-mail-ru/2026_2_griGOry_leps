import { Component } from 'goget-vdom';
import { Button } from '@/components/button/button';
import { type CategoryNode, type SearchFilters } from '@/lib/api';
import { categoryPath } from '@/lib/listings';

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

    componentDidMount() {
        this.dialog?.showModal();
        document.body.classList.add('body--modal-open');
    }

    componentWillUnmount() {
        this.dialog?.close();
        document.body.classList.remove('body--modal-open');
    }

    update = (patch: Partial<SearchFilters>) => {
        this.setState(({ draft }) => ({ draft: { ...draft, ...patch } }));
    };

    render() {
        const { categories, status, onClose, onApply, onRetry } = this.props;
        const { draft } = this.state;
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
                                    type="number"
                                    name="price_min"
                                    aria-label="Цена от"
                                    placeholder="от"
                                    min="0"
                                    step="0.01"
                                    max={draft.price_max || undefined}
                                    value={draft.price_min ?? ''}
                                    onInput={(e: Event) =>
                                        this.update({ price_min: (e.currentTarget as HTMLInputElement).value })}
                                />
                                <input
                                    class="filter-drawer__input"
                                    type="number"
                                    name="price_max"
                                    aria-label="Цена до"
                                    placeholder="до"
                                    min={draft.price_min || '0'}
                                    step="0.01"
                                    value={draft.price_max ?? ''}
                                    onInput={(e: Event) =>
                                        this.update({ price_max: (e.currentTarget as HTMLInputElement).value })}
                                />
                            </div>
                        </fieldset>

                        <label class="filter-drawer__group">
                            <span class="filter-drawer__legend">Город</span>
                            <input
                                class="filter-drawer__input"
                                name="city"
                                placeholder="Любой город"
                                value={draft.city ?? ''}
                                onInput={(e: Event) =>
                                    this.update({ city: (e.currentTarget as HTMLInputElement).value })}
                            />
                        </label>

                        <fieldset class="filter-drawer__group">
                            <legend class="filter-drawer__legend">Доставка</legend>
                            {[true, false].map(value => (
                                <label key={String(value)} class="filter-drawer__choice">
                                    <input
                                        class="filter-drawer__check"
                                        type="checkbox"
                                        checked={draft.has_delivery === value}
                                        onChange={(e: Event) => this.update({
                                            has_delivery: (e.currentTarget as HTMLInputElement).checked
                                                ? value
                                                : undefined,
                                        })}
                                    />
                                    {value ? 'С доставкой' : 'Без доставки'}
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
