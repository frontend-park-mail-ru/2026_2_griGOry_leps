import { Component } from '@/vdom';
import type { CategoryNode } from '@/lib/api';
import { categoryPath } from '@/lib/listings';
import './category-select.scss';

export interface CategorySelectProps {
    categories: CategoryNode[];
    /** id листа строкой, '' — не выбрана */
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

interface CategorySelectState {
    open: boolean;
    path: number[];
}

const VISIBLE_COLUMNS = 3;

const ChevronIcon = () => (
    <svg class="category-select__chevron" viewBox="0 0 16 16" width="16" height="16" fill="none"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
);

export class CategorySelect extends Component<CategorySelectProps, CategorySelectState> {
    state: CategorySelectState = { open: false, path: [] };

    selected(): CategoryNode[] {
        const id = Number(this.props.value);
        return id ? categoryPath(this.props.categories, id) : [];
    }

    open = () => {
        this.setState({ open: true, path: this.selected().slice(0, -1).map((node) => node.id) });
    };

    pick(node: CategoryNode, level: number) {
        if (node.children.length) {
            this.setState(({ path }) => ({ path: [...path.slice(0, level), node.id] }));
            return;
        }
        this.setState({ open: false, path: [] });
        this.props.onChange(String(node.id));
    }

    columns(): CategoryNode[][] {
        const columns = [this.props.categories];
        for (const id of this.state.path) {
            const node = columns[columns.length - 1].find((item) => item.id === id);
            if (!node) break;
            columns.push(node.children);
        }
        return columns;
    }

    renderColumns() {
        const { path } = this.state;
        const selectedId = Number(this.props.value);
        const columns = this.columns();
        const first = Math.max(columns.length - VISIBLE_COLUMNS, 0);

        return (
            <div class="category-select__columns">
                {columns.slice(first).map((nodes, i) => {
                    const level = first + i;
                    return (
                        <ul key={level} class="category-select__column">
                            {nodes.map((node) => {
                                const active = path[level] === node.id || node.id === selectedId;
                                return (
                                    <li key={node.id}>
                                        <button
                                            type="button"
                                            class={active ? 'category-select__item category-select__item--active' : 'category-select__item'}
                                            onClick={() => this.pick(node, level)}
                                        >
                                            {node.name}
                                            {node.children.length > 0 && <ChevronIcon />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    );
                })}
            </div>
        );
    }

    render() {
        const { error = '' } = this.props;
        const selected = this.selected();
        const showColumns = this.state.open || !selected.length;

        return (
            <div id="listing-category" class={error ? 'category-select category-select--error' : 'category-select'}>
                {showColumns ? this.renderColumns() : (
                    <div class="category-select__current">
                        <span class="category-select__path">{selected.map((node) => node.name).join(' → ')}</span>
                        <button type="button" class="category-select__change" onClick={this.open}>Изменить</button>
                    </div>
                )}
                <p class="form-field__error" data-error-for="category_id">{error || null}</p>
            </div>
        );
    }
}
