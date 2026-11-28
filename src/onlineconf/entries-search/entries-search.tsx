import { Component } from 'goget-vdom';
import { debounce } from 'goget-debounce';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/button/button';
import { Select } from '@/components/select/select';
import {
    ONLINECONF_SCOPES,
    searchEntries,
    type OnlineconfEntry,
    type OnlineconfKind,
    type OnlineconfScope,
} from '../api';
import { formatValue, highlight } from '../format';
import './entries-search.scss';

interface EntriesSearchProps {
    kind: OnlineconfKind;
}

type SearchResult =
    | { status: 'ready'; items: OnlineconfEntry[]; filtered: boolean }
    | { status: 'forbidden' }
    | { status: 'invalid' }
    | { status: 'error' };

interface EntriesSearchState {
    name: string;
    scope: OnlineconfScope | '';
    /** Пока идёт новый поиск, прошлый список остаётся на экране */
    loading: boolean;
    result: SearchResult | null;
    /** Название, по которому получен текущий список, — для подсветки */
    searched: string;
}

const SEARCH_DELAY_MS = 300;

const scopeOptions = [
    { value: '', label: 'Все скоупы' },
    ...ONLINECONF_SCOPES.map(scope => ({ value: scope, label: scope })),
];

function isScope(value: string | null): value is OnlineconfScope {
    return ONLINECONF_SCOPES.includes(value as OnlineconfScope);
}

/** Фильтр живёт в URL, чтобы поиском можно было поделиться; роутер каркаса не нужен. */
function readFilter(): Pick<EntriesSearchState, 'name' | 'scope'> {
    const params = new URLSearchParams(location.search);
    const scope = params.get('scope');
    return { name: params.get('name') ?? '', scope: isScope(scope) ? scope : '' };
}

function writeFilter(name: string, scope: string) {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of [['name', name], ['scope', scope]]) {
        if (value) params.set(key, value);
        else params.delete(key);
    }
    const search = params.toString();
    history.replaceState(history.state, '', location.pathname + (search ? `?${search}` : '') + location.hash);
}

/** Поиск по названию и фильтр по скоупу для вкладок «Конфиги» и «Фича-флаги». */
export class EntriesSearch extends Component<EntriesSearchProps, EntriesSearchState> {
    state: EntriesSearchState = { ...readFilter(), loading: true, result: null, searched: '' };

    private requestId = 0;

    /** vdom переиспользует экземпляр при смене вкладки и не передаёт прошлые пропсы. */
    private searchedKind = this.props.kind;

    private scheduleSearch = debounce(() => void this.search(), SEARCH_DELAY_MS);

    componentDidMount() {
        void this.search();
    }

    componentDidUpdate() {
        if (this.props.kind === this.searchedKind) return;
        this.searchedKind = this.props.kind;
        void this.search();
    }

    componentWillUnmount() {
        this.scheduleSearch.cancel();
        this.requestId++;
    }

    search = async () => {
        this.scheduleSearch.cancel();
        const id = ++this.requestId;
        const name = this.state.name.trim();
        const { scope } = this.state;
        writeFilter(name, scope);
        this.setState({ loading: true });

        try {
            const items = await searchEntries({
                kind: this.props.kind,
                ...(name && { name }),
                ...(scope && { scope }),
            });
            if (id !== this.requestId) return;
            this.setState({ loading: false, result: { status: 'ready', items, filtered: Boolean(name || scope) }, searched: name });
        } catch (error) {
            if (id !== this.requestId) return;
            const status = error instanceof ApiError ? error.status : 0;
            if (status === 403) this.setState({ loading: false, result: { status: 'forbidden' } });
            else if (status === 400) this.setState({ loading: false, result: { status: 'invalid' } });
            else this.setState({ loading: false, result: { status: 'error' } });
        }
    };

    handleInput = (event: Event) => {
        this.setState({ name: (event.currentTarget as HTMLInputElement).value });
        this.scheduleSearch();
    };

    handleSubmit = (event: Event) => {
        event.preventDefault();
        void this.search();
    };

    handleScope = (scope: string) => {
        this.setState({ scope: isScope(scope) ? scope : '' });
        void this.search();
    };

    /** Один постоянный live-регион: пересоздаваемый элемент читалки часто не озвучивают. */
    statusText(): string {
        const { loading, result } = this.state;
        if (loading) return 'Ищем…';
        if (result?.status !== 'ready') return '';
        if (result.items.length) return `Найдено ${result.items.length}`;
        if (result.filtered) return 'Ничего не найдено';
        return this.props.kind === 'config' ? 'Пока нет конфигов' : 'Пока нет флагов';
    }

    renderResult() {
        const { loading, result, searched } = this.state;

        if (!loading && result?.status === 'forbidden') {
            return <p class="entries-search__alert" role="alert">Нет доступа к OnlineConf</p>;
        }
        if (!loading && result?.status === 'invalid') {
            return <p class="entries-search__alert" role="alert">Некорректный фильтр</p>;
        }
        if (!loading && result?.status === 'error') {
            return (
                <div class="entries-search__alert" role="alert">
                    <p>Не удалось загрузить список</p>
                    <Button variant="secondary" text="Попробовать ещё раз" onClick={() => void this.search()} />
                </div>
            );
        }
        if (result?.status !== 'ready' || !result.items.length) return null;

        return (
            <ul class="entries-search__list">
                {result.items.map(entry => (
                    <li key={entry.id} class="entries-search__item" data-entry-id={String(entry.id)}>
                        <span class="entries-search__name">{highlight(entry.name, searched)}</span>
                        <span class="entries-search__scope">{entry.scope}</span>
                        <span class="entries-search__value">{formatValue(entry)}</span>
                    </li>
                ))}
            </ul>
        );
    }

    render() {
        const { name, scope } = this.state;

        return (
            <section class="entries-search">
                <form class="entries-search__form" role="search" onSubmit={this.handleSubmit}>
                    <label class="entries-search__field">
                        <span>Название</span>
                        <input
                            type="search"
                            name="name"
                            autocomplete="off"
                            value={name}
                            onInput={this.handleInput}
                        />
                    </label>
                    <Select
                        inline
                        id="onlineconf-scope"
                        label="Скоуп"
                        options={scopeOptions}
                        value={scope}
                        onChange={this.handleScope}
                    />
                </form>
                <p class="entries-search__status" role="status">{this.statusText()}</p>
                {this.renderResult()}
            </section>
        );
    }
}
