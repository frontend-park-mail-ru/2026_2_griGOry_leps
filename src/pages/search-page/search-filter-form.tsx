import { Component } from 'goget-vdom';
import { navigate } from 'goget-router';
import { ChipGroup } from '@/components/chip-group/chip-group';
import { Select } from '@/components/select/select';
import { getCategoryTree, type CategoryNode, type SearchFilters, type Sort } from '@/lib/api';
import { formatPrice } from '@/lib/core';
import { categoryPath } from '@/lib/listings';
import { FilterDrawer } from './filter-drawer';

interface FilterFormProps {
    query: string;
    filters: SearchFilters;
}

interface ToolbarState {
    categories: CategoryNode[];
    status: 'loading' | 'ready' | 'error';
    open: boolean;
}

interface ActiveFilter {
    label: string;
    keys: (keyof SearchFilters)[];
}

function activeFilters(filters: SearchFilters, categories: CategoryNode[]): ActiveFilter[] {
    const chips: ActiveFilter[] = [];
    const { category_id: id, city, price_min: min, price_max: max, has_delivery: delivery } = filters;

    if (id) {
        const path = categoryPath(categories, id);
        chips.push({
            label: path.at(-1)?.name ?? 'Выбрана категория',
            keys: ['category_id'],
        });
    }

    if (city) chips.push({ label: city, keys: ['city'] });

    if (min || max) {
        const range = [min && `от ${formatPrice(min)}`, max && `до ${formatPrice(max)}`]
            .filter(Boolean)
            .join(' ');
        chips.push({ label: `Цена: ${range} ₽`, keys: ['price_min', 'price_max'] });
    }

    if (delivery !== undefined) {
        chips.push({
            label: delivery ? 'С доставкой' : 'Без доставки',
            keys: ['has_delivery'],
        });
    }

    return chips;
}

const sortOptions = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'price_asc', label: 'Сначала дешевле' },
    { value: 'price_desc', label: 'Сначала дороже' },
];

export class SearchFilterForm extends Component<FilterFormProps, ToolbarState> {
    state: ToolbarState = { categories: [], status: 'loading', open: false };

    componentDidMount() {
        void this.loadCategories();
    }

    loadCategories = async () => {
        this.setState({ status: 'loading' });
        try {
            this.setState({ categories: await getCategoryTree(), status: 'ready' });
        } catch {
            this.setState({ status: 'error' });
        }
    };

    apply = (filters: SearchFilters) => {
        const params = new URLSearchParams();

        if (this.props.query) params.set('q', this.props.query);
        for (const [name, value] of Object.entries(filters)) {
            if (value !== undefined && value !== '') params.set(name, String(value));
        }

        const url = params.size ? `/search?${params}` : '/search';
        this.setState({ open: false });
        if (url !== location.pathname + location.search) navigate(url);
    };

    render() {
        const { categories, open, status } = this.state;
        const { filters } = this.props;
        const chips = activeFilters(filters, categories);
        const selected = categoryPath(categories, filters.category_id ?? 0)[0];
        const quick = categories.slice(0, 3);
        if (selected && !quick.includes(selected)) quick.push(selected);

        return (
            <div class="search-filters">
                <div class="search-filters__row">
                    <ChipGroup
                        name="category"
                        label="Категории"
                        value={String(selected?.id ?? filters.category_id ?? '')}
                        options={[
                            { value: '', label: 'Все категории' },
                            ...quick.map(category => ({
                                value: String(category.id),
                                label: category.name,
                            })),
                        ]}
                        onChange={value => this.apply({
                            ...filters,
                            category_id: value ? Number(value) : undefined,
                        })}
                    />
                    <Select
                        inline
                        id="search-sort"
                        label="Сортировка"
                        options={sortOptions}
                        value={filters.sort ?? 'newest'}
                        onChange={sort => this.apply({ ...filters, sort: sort as Sort })}
                    />
                </div>

                <div class="search-filters__active">
                    <span>Фильтры:</span>
                    <button
                        class="chip-group__chip"
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => this.setState({ open: true })}
                    >
                        {chips.length ? `Все фильтры · ${chips.length}` : 'Все фильтры'}
                    </button>

                    {chips.map(chip => (
                        <button
                            key={chip.keys[0]}
                            type="button"
                            class="chip-group__chip"
                            aria-label={`Убрать: ${chip.label}`}
                            onClick={() => {
                                const next = { ...filters };
                                for (const key of chip.keys) delete next[key];
                                this.apply(next);
                            }}
                        >
                            {chip.label} <span aria-hidden="true">×</span>
                        </button>
                    ))}

                    {chips.length > 0 && (
                        <button
                            class="search-filters__reset"
                            type="button"
                            onClick={() => this.apply({ sort: filters.sort })}
                        >Сбросить всё</button>
                    )}
                </div>

                {open && (
                    <FilterDrawer
                        filters={filters}
                        categories={categories}
                        status={status}
                        onRetry={this.loadCategories}
                        onApply={this.apply}
                        onClose={() => this.setState({ open: false })}
                    />
                )}
            </div>
        );
    }
}
