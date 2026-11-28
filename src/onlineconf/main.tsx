import { Component, render } from 'goget-vdom';
import { Button } from '@/components/button/button';
import { Footer } from '@/components/footer/footer';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import '@/components/header/header.scss';
import { getMe, type User } from '@/lib/api';
import { denied, errorText, listEntries, scopes, type Entry, type Kind, type Scope } from './api';
import { Editor } from './editor';
import { readRule } from './values';
import './style.scss';

type Props = { kind: Kind; user: User | null };

interface State {
    status: 'loading' | 'ready' | 'denied' | 'error';
    entries: Entry[];
    scope: Scope | '';
    name: string;
    editor: Entry | 'new' | null;
    message: string;
}

function FlagSummary({ value }: { value: unknown }) {
    const rule = readRule(value);
    if (!rule) return <span>Неизвестный формат флага</span>;

    return (
        <div class="oc-rollout">
            <div class="oc-rollout__line">
                <span>Раскатка <strong>{rule.rollout_percent}%</strong></span>
                <progress
                    class="oc-rollout__bar"
                    max={100}
                    value={rule.rollout_percent}
                    aria-label="Процент раскатки"
                />
            </div>
            <small>
                В списке включения: {rule.included_user_ids.length} · В списке исключения: {rule.excluded_user_ids.length}
            </small>
        </div>
    );
}

class Admin extends Component<Props, State> {
    state: State = {
        status: 'loading',
        entries: [],
        scope: '',
        name: '',
        editor: null,
        message: '',
    };

    private revision = 0;

    componentDidMount() {
        void this.load();
    }

    componentWillUnmount() {
        this.revision++;
    }

    noAccess = () => {
        this.revision++;
        this.setState({ status: 'denied', entries: [], editor: null, message: '' });
    };

    load = async (message = '') => {
        const revision = ++this.revision;
        this.setState({ status: 'loading', editor: null, message: '' });

        try {
            const entries = await listEntries(this.props.kind, this.state.scope, this.state.name);
            if (revision === this.revision) {
                this.setState({ status: 'ready', entries, message });
            }
        } catch (error) {
            if (revision !== this.revision) return;

            if (denied(error)) {
                this.noAccess();
            } else {
                this.setState({
                    status: 'error',
                    entries: [],
                    message: errorText(error, 'Не удалось загрузить список.'),
                });
            }
        }
    };

    renderHeader() {
        const { user } = this.props;

        return (
            <header class="header">
                <div class="oc-bar">
                    <a class="oc-brand" href="/" aria-label="На главную GoGet">
                        <img src="/img/goget.svg" alt="GoGet" width="88" height="40" />
                        <span class="oc-brand__name">OnlineConf</span>
                    </a>

                    {user && (
                        <details class="oc-account">
                            <summary class="oc-account__toggle" aria-label="Меню профиля">
                                <UserAvatar user={user} />
                                <img src="/img/chevron-down.svg" alt="" width="16" height="16" />
                            </summary>
                            <div class="oc-account__menu">
                                <strong>{user.first_name || user.email}</strong>
                                <a class="oc-link" href="/profile/edit">Настройки профиля</a>
                            </div>
                        </details>
                    )}
                </div>
            </header>
        );
    }

    renderWorkspace() {
        const { kind } = this.props;
        const { status, scope, name } = this.state;

        if (status === 'denied') {
            return (
                <section class="oc-notice" role="alert">
                    <h2>Нет доступа</h2>
                    <p>Для управления настройками нужен аккаунт администратора GoGet.</p>
                </section>
            );
        }

        return (
            <section aria-label={kind === 'config' ? 'Список конфигов' : 'Список фича-флагов'}>
                <form class="oc-filters" role="search" onSubmit={(event: Event) => {
                    event.preventDefault();
                    void this.load();
                }}>
                    <label class="oc-scope-label">
                        Скоуп
                        <select class="oc-control" onChange={(event: Event) => {
                            const select = event.currentTarget as HTMLSelectElement;
                            this.setState({ scope: select.value as Scope | '' });
                            void this.load();
                        }}>
                            <option value="" selected={!scope}>Все скоупы</option>
                            {scopes.map(s => (
                                <option key={s} value={s} selected={scope === s}>{s}</option>
                            ))}
                        </select>
                    </label>
                    <label class="oc-scope-label">
                        Название
                        <input class="oc-control" type="search" value={name} placeholder="Поиск по названию"
                            maxLength={255} onInput={(event: Event) => {
                                this.setState({ name: (event.currentTarget as HTMLInputElement).value });
                            }} />
                    </label>
                    <Button type="submit" text="Найти" variant="secondary" />
                </form>
                {this.renderEntries()}
            </section>
        );
    }

    renderEntries() {
        const { kind } = this.props;
        const { status, scope, name, entries, editor, message } = this.state;

        if (status === 'error') {
            return (
                <div class="oc-notice" role="alert">
                    <p>{message}</p>
                    <Button text="Повторить" onClick={() => void this.load()} />
                </div>
            );
        }

        if (status === 'loading') {
            return <p class="oc-notice" role="status">Загружаем записи…</p>;
        }

        return (
            <>
                {message && <p class="oc-saved" role="status">{message}</p>}

                {entries.length ? (
                    <ul class="oc-list">
                        {entries.map(entry => (
                            <li key={entry.id} class="oc-list__row">
                                <div class="oc-list__identity">
                                    <strong>{entry.name}</strong>
                                    <span class="oc-scope">{entry.scope}</span>
                                </div>

                                {kind === 'config'
                                    ? <code class="oc-list__json">{JSON.stringify(entry.value)}</code>
                                    : <FlagSummary value={entry.value} />}

                                <Button
                                    text="Изменить"
                                    variant="outline"
                                    disabled={kind === 'flag' && !readRule(entry.value)}
                                    onClick={() => this.setState({ editor: entry, message: '' })}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p class="oc-notice">
                        {scope || name.trim() ? 'По заданным фильтрам записей нет.' : 'Здесь пока нет записей.'}
                    </p>
                )}

                {editor && (
                    <Editor
                        kind={kind}
                        scope={scope || 'frontend'}
                        entry={editor === 'new' ? undefined : editor}
                        onClose={() => this.setState({ editor: null })}
                        onDenied={this.noAccess}
                        onSaved={() => void this.load('Изменения сохранены.')}
                    />
                )}
            </>
        );
    }

    render() {
        const config = this.props.kind === 'config';

        return (
            <div class="oc-layout">
                {this.renderHeader()}

                <main class="oc-board">
                    <div class="oc-board__heading">
                        <h1 class="oc-board__title">
                            {config ? 'Параметры' : 'Фича-флаги'}
                        </h1>

                        {this.state.status !== 'denied' && (
                            <Button
                                text={config ? '+ Создать конфиг' : '+ Создать фича-флаг'}
                                variant="primary"
                                disabled={this.state.status !== 'ready'}
                                onClick={() => this.setState({ editor: 'new', message: '' })}
                            />
                        )}
                    </div>

                    {this.state.status !== 'denied' && (
                        <nav class="oc-nav" aria-label="Разделы OnlineConf">
                            <a class="oc-nav__link" href="#configs" aria-current={config ? 'page' : undefined}>Параметры</a>
                            <a class="oc-nav__link" href="#flags" aria-current={config ? undefined : 'page'}>Фича-флаги</a>
                        </nav>
                    )}
                    {this.renderWorkspace()}
                </main>
                <Footer />
            </div>
        );
    }
}

let user: User | null = null;

function showTab() {
    const kind = location.hash === '#flags' ? 'flag' : 'config';
    render(document.getElementById('app')!, <Admin key={kind} kind={kind} user={user} />);
}

window.addEventListener('hashchange', showTab);
showTab();

void getMe().then(me => {
    user = me;
    showTab();
}).catch(() => {
});
