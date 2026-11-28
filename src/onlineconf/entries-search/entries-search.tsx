import { Component } from 'goget-vdom';
import { debounce } from 'goget-debounce';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/button/button';
import { Select } from '@/components/select/select';
import {
    accessStatus,
    errorText,
    scopes,
    searchEntries,
    type Entry,
    type Scope,
} from '../api';
import { Editor } from '../editor';
import { History } from '../history';
import { formatValue, highlight } from '../format';
import { hashFor, type HashFilter } from '../hash';
import { readRule } from '../values';
import './entries-search.scss';

type SearchResult =
    | { status: 'ready'; items: Entry[]; filtered: boolean }
    | { status: 'unauthenticated' }
    | { status: 'forbidden' }
    | { status: 'invalid' }
    | { status: 'error'; message: string };

interface EntriesSearchState {
    name: string;
    scope: Scope | '';
    /** Пока идёт новый поиск, прошлый список остаётся на экране */
    loading: boolean;
    result: SearchResult | null;
    /** Название, по которому получен текущий список, — для подсветки */
    searched: string;
    editor: Entry | 'new' | null;
    history: Entry | null;
    savedMessage: string;
}

const SEARCH_DELAY_MS = 300;

const scopeOptions = [
    { value: '', label: 'Все скоупы' },
    ...scopes.map(scope => ({ value: scope, label: scope })),
];

function isScope(value: string | null): value is Scope {
    return scopes.some(scope => scope === value);
}

/** Поиск по названию и фильтр по скоупу для вкладок «Конфиги» и «Фича-флаги». */
export class EntriesSearch extends Component<HashFilter, EntriesSearchState> {
    state: EntriesSearchState = {
        name: this.props.name,
        scope: this.props.scope,
        loading: true,
        result: null,
        searched: '',
        editor: null,
        history: null,
        savedMessage: '',
    };

    private requestId = 0;
    private mounted = false;
    private url = location.href;

    private scheduleSearch = debounce(() => void this.search(), SEARCH_DELAY_MS);

    componentDidMount() {
        this.mounted = true;
        void this.search();
    }

    componentWillUnmount() {
        this.mounted = false;
        this.scheduleSearch.cancel();
        this.requestId++;
    }

    search = async () => {
        // Запрос и сохранение могут завершиться между сменой адреса и hashchange.
        if (!this.isCurrentPage()) return;
        this.scheduleSearch.cancel();
        const id = ++this.requestId;
        const name = this.state.name.trim();
        const { scope } = this.state;
        const { kind } = this.props;
        history.replaceState(history.state, '', location.pathname + location.search + hashFor(kind, scope, name));
        this.url = location.href;
        this.setState({ loading: true });

        try {
            const items = await searchEntries({
                kind,
                ...(name && { name }),
                ...(scope && { scope }),
            });
            if (id !== this.requestId || !this.isCurrentPage()) return;
            this.setState({ loading: false, result: { status: 'ready', items, filtered: Boolean(name || scope) }, searched: name });
        } catch (error) {
            if (id !== this.requestId || !this.isCurrentPage()) return;
            const status = accessStatus(error);
            if (status) {
                this.noAccess(status);
            } else {
                const result: SearchResult = error instanceof ApiError && error.status === 400
                    ? { status: 'invalid' }
                    : { status: 'error', message: errorText(error, 'Не удалось загрузить список') };
                this.setState({ loading: false, result });
            }
        }
    };

    private isCurrentPage(): boolean {
        return this.mounted && location.href === this.url;
    }

    noAccess = (status: 401 | 403) => {
        if (!this.isCurrentPage()) return;
        this.scheduleSearch.cancel();
        this.requestId++;
        this.setState({
            loading: false,
            result: { status: status === 401 ? 'unauthenticated' : 'forbidden' },
            editor: null,
            history: null,
            savedMessage: '',
        });
    };

    handleInput = (event: Event) => {
        this.requestId++;
        this.setState({ name: (event.currentTarget as HTMLInputElement).value, savedMessage: '' });
        this.scheduleSearch();
    };

    handleSubmit = (event: Event) => {
        event.preventDefault();
        void this.search();
    };

    handleScope = (scope: string) => {
        this.setState({ scope: isScope(scope) ? scope : '', savedMessage: '' });
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

        if (!loading && result?.status === 'invalid') {
            return <p class="entries-search__alert" role="alert">Некорректный фильтр</p>;
        }
        if (!loading && result?.status === 'error') {
            return (
                <div class="entries-search__alert" role="alert">
                    <p>{result.message}</p>
                    <Button variant="secondary" text="Попробовать ещё раз" onClick={() => void this.search()} />
                </div>
            );
        }
        if (result?.status !== 'ready' || !result.items.length) return null;

        return (
            <ul class="oc-list">
                {result.items.map(entry => {
                    const rule = entry.kind === 'flag' ? readRule(entry.value) : null;
                    return (
                        <li key={entry.id} class="oc-list__row" data-entry-id={String(entry.id)}>
                            <div class="oc-list__identity">
                                <strong>{highlight(entry.name, searched)}</strong>
                                <span class="oc-scope">{entry.scope}</span>
                            </div>
                            {entry.kind === 'config' ? (
                                <code class="oc-list__json" title={JSON.stringify(entry.value)}>{formatValue(entry)}</code>
                            ) : rule ? (
                                <div class="oc-rollout">
                                    <div class="oc-rollout__line">
                                        <span>{formatValue(entry)}</span>
                                        <progress class="oc-rollout__bar" max={100} value={rule.rollout_percent}
                                            aria-label="Процент раскатки" />
                                    </div>
                                </div>
                            ) : <span>Неизвестный формат флага</span>}
                            
                            <div class="oc-entry-actions">
                                <Button text="Изменить" variant="outline"
                                    disabled={loading || (entry.kind === 'flag' && !rule)}
                                    onClick={() => this.setState({
                                        editor: entry,
                                        savedMessage: '',
                                    })} />

                                <Button text="История" variant="outline"
                                    disabled={loading}
                                    onClick={() => this.setState({
                                        history: entry,
                                        savedMessage: '',
                                    })} />
                            </div>

                        </li>
                    );
                })}
            </ul>
        );
    }

    render() {
        const {
            name,
            scope,
            editor,
            history,
            loading,
            result,
            savedMessage,
        } = this.state;
        const { kind } = this.props;
        const config = kind === 'config';
        const hasAccess = result?.status !== 'unauthenticated' && result?.status !== 'forbidden';

        return (
            <div>
                <div class="oc-board__heading">
                    <h1 class="oc-board__title">{config ? 'Параметры' : 'Фича-флаги'}</h1>
                    {hasAccess && (
                        <Button text={config ? '+ Создать конфиг' : '+ Создать фича-флаг'}
                            disabled={loading || result?.status !== 'ready'}
                            onClick={() => this.setState({ editor: 'new', savedMessage: '' })} />
                    )}
                </div>
                {!hasAccess ? (
                    <section class="oc-notice" role="alert">
                        {result?.status === 'unauthenticated' ? (
                            <>
                                <p>Войдите в GoGet, чтобы открыть OnlineConf.</p>
                                <a class="oc-link" href="/login">Войти</a>
                            </>
                        ) : (
                            <>
                                <h2>Нет доступа к OnlineConf</h2>
                                <p>Для управления настройками нужен аккаунт администратора GoGet.</p>
                            </>
                        )}
                    </section>
                ) : (
                    <>
                        <nav class="oc-nav" aria-label="Разделы OnlineConf">
                            <a class="oc-nav__link" href="#configs" aria-current={config ? 'page' : undefined}>Параметры</a>
                            <a class="oc-nav__link" href="#flags" aria-current={config ? undefined : 'page'}>Фича-флаги</a>
                        </nav>
                        {this.renderWorkspace(name, scope)}
                        {savedMessage && <p class="oc-saved" role="status">{savedMessage}</p>}

                        {history && (
                            <History
                                key={history.id}
                                entry={history}
                                onClose={() => this.setState({ history: null })}
                                onDenied={this.noAccess}
                            />
                        )}

                        {editor && (
                            <Editor kind={kind} scope={scope || 'frontend'}
                                entry={editor === 'new' ? undefined : editor}
                                onClose={() => this.setState({ editor: null })}
                                onDenied={this.noAccess}
                                onSaved={() => {
                                    if (!this.isCurrentPage()) return;
                                    this.setState({ editor: null, savedMessage: 'Изменения сохранены.' });
                                    void this.search();
                                }} />
                        )}
                    </>
                )}
            </div>
        );
    }

    renderWorkspace(name: string, scope: Scope | '') {
        return (
            <section class="entries-search" aria-label={this.props.kind === 'config' ? 'Список конфигов' : 'Список фича-флагов'}>
                <form class="entries-search__form" role="search" onSubmit={this.handleSubmit}>
                    <label class="entries-search__field">
                        <span>Название</span>
                        <input
                            type="search"
                            name="name"
                            autocomplete="off"
                            class="oc-control"
                            maxLength={255}
                            placeholder="Поиск по названию"
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
                    <Button type="submit" text="Найти" variant="secondary" />
                </form>
                <p class="entries-search__status" role="status">{this.statusText()}</p>
                {this.renderResult()}
            </section>
        );
    }
}
