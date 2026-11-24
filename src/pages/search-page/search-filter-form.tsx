import { Component } from 'goget-vdom';
import { navigate } from 'goget-router';
import { CategorySelect } from '@/components/category-select/category-select';
import { getCategoryTree, type CategoryNode, type SearchFilters } from '@/lib/api';

interface FilterFormProps {
    query: string;
    filters: SearchFilters;
}

interface FilterFormState {
    categories: CategoryNode[];
    categoryError: boolean;
    category: string;
    city: string;
    minPrice: string;
    maxPrice: string;
    delivery: string;
}

export class SearchFilterForm extends Component<FilterFormProps, FilterFormState> {
    state: FilterFormState = {
        categories: [],
        categoryError: false,
        category: String(this.props.filters.category_id ?? ''),
        city: this.props.filters.city ?? '',
        minPrice: this.props.filters.price_min ?? '',
        maxPrice: this.props.filters.price_max ?? '',
        delivery: String(this.props.filters.has_delivery ?? ''),
    };

    async componentDidMount() {
        try {
            const categories = await getCategoryTree();
            this.setState({ categories });
        } catch {
            this.setState({ categoryError: true });
        }
    }

    apply = (event: Event) => {
        event.preventDefault();

        const { category, city, minPrice, maxPrice, delivery } = this.state;
        const params = new URLSearchParams();

        if (this.props.query) params.set('q', this.props.query);
        if (category) params.set('category_id', category);
        if (city.trim()) params.set('city', city.trim());
        if (minPrice) params.set('price_min', minPrice);
        if (maxPrice) params.set('price_max', maxPrice);
        if (delivery) params.set('has_delivery', delivery);

        const search = params.toString();
        navigate(search ? `/search?${search}` : '/search');
    };

    render() {
        const { categories, categoryError, category, city, minPrice, maxPrice, delivery } = this.state;

        return (
            <form class="search-filters" aria-label="Фильтры поиска" onSubmit={this.apply}>
                <fieldset class="search-filters__category">
                    <legend>Категория</legend>

                    {categoryError && <p>Не удалось загрузить категории.</p>}

                    {categories.length > 0 && (
                        <CategorySelect
                            categories={categories}
                            value={category}
                            onChange={(value) => this.setState({ category: value })}
                        />
                    )}

                    {category && (
                        <button type="button" onClick={() => this.setState({ category: '' })}>
                            Сбросить категорию
                        </button>
                    )}
                </fieldset>

                <label class="search-filters__field">
                    Город
                    <input
                        class="search-filters__control"
                        type="text"
                        name="city"
                        value={city}
                        onInput={(event: Event) =>
                            this.setState({ city: (event.currentTarget as HTMLInputElement).value })}
                    />
                </label>

                <label class="search-filters__field">
                    Цена от, ₽
                    <input
                        class="search-filters__control"
                        type="number"
                        name="price_min"
                        min="0"
                        max={maxPrice || undefined}
                        step="0.01"
                        value={minPrice}
                        onInput={(event: Event) =>
                            this.setState({ minPrice: (event.currentTarget as HTMLInputElement).value })}
                    />
                </label>

                <label class="search-filters__field">
                    Цена до, ₽
                    <input
                        class="search-filters__control"
                        type="number"
                        name="price_max"
                        min={minPrice || '0'}
                        step="0.01"
                        value={maxPrice}
                        onInput={(event: Event) =>
                            this.setState({ maxPrice: (event.currentTarget as HTMLInputElement).value })}
                    />
                </label>

                <label class="search-filters__field">
                    Доставка
                    <select
                        class="search-filters__control"
                        name="has_delivery"
                        onChange={(event: Event) =>
                            this.setState({ delivery: (event.currentTarget as HTMLSelectElement).value })}
                    >
                        <option value="" selected={delivery === ''}>Любая</option>
                        <option value="true" selected={delivery === 'true'}>С доставкой</option>
                        <option value="false" selected={delivery === 'false'}>Без доставки</option>
                    </select>
                </label>

                <button type="submit" class="search-filters__apply">
                    Применить фильтры
                </button>
            </form>
        );
    }
}
