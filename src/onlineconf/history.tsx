
import { Component } from 'goget-vdom';
import { Button } from '@/components/button/button';

import {
    getEntryHistory,
    accessStatus,
    errorText,
    type Entry,
    type HistoryEntry,
} from './api';

interface Props {
    entry: Entry;
    onClose: () => void;
    onDenied: (status: 401 | 403) => void;
}

interface State {
    items: HistoryEntry[];
    loading: boolean;
    error: string;
}

function fieldName(field: string): string {
    const names: Record<string, string> = {
        percent: 'Раскатка',
        rollout_percent: 'Раскатка',
        included_user_ids: 'Всегда включён для',
        excluded_user_ids: 'Всегда выключен для',
        name: 'Название',
        scope: 'Скоуп',
        value: 'Значение',
    };

    return names[field] ?? field;
}

function formatValue(
    field: string,
    value: unknown
): string {
    if (value === null || value === undefined) {
        return '—';
    }

    if (
        (field === 'percent' ||
         field === 'rollout_percent') &&
        typeof value === 'number'
    ) {
        return `${value}%`;
    }

    if (typeof value === 'boolean') {
        return value ? 'Включено' : 'Выключено';
    }

    if (typeof value === 'string') {
        return value;
    }

    return JSON.stringify(value) ?? '—';
}

export class History extends Component<Props, State> {
    state: State = {
        items: [],
        loading: true,
        error: '',
    };

    private dialog: HTMLDialogElement | null = null;
    private active = false;

    private setDialog = (el: HTMLElement | null) => {
        this.dialog = el as HTMLDialogElement | null;
    };

    componentDidMount() {
        this.active = true;
        this.dialog?.showModal();
        void this.load();
    }

    componentWillUnmount() {
        this.active = false;
        this.dialog?.close();
    }

    load = async () => {
        this.setState({
            loading: true,
            error: '',
        });

        try {
            const items = await getEntryHistory(
                this.props.entry.id
            );

            if (!this.active) return;

            this.setState({
                items,
                loading: false,
            });
        } catch (error) {
            if (!this.active) return;

            const status = accessStatus(error);

            if (status) {
                this.props.onDenied(status);
                return;
            }

            this.setState({
                loading: false,
                error: errorText(
                    error,
                    'Не удалось загрузить историю.'
                ),
            });
        }
    };

    render() {
        const { entry, onClose } = this.props;
        const { items, loading, error } = this.state;

        return (
            <dialog
                ref={this.setDialog}
                class="oc-editor oc-history"
                aria-labelledby="oc-history-title"
                onCancel={(event: Event) => {
                    event.preventDefault();
                    onClose();
                }}
            >
                <h2
                    class="oc-editor__title"
                    id="oc-history-title"
                >
                    История изменений
                </h2>

                <p class="oc-history__subtitle">
                    {entry.scope} / {entry.name}
                </p>

                {loading && (
                    <p class="oc-notice">
                        Загрузка истории…
                    </p>
                )}

                {error && (
                    <div>
                        <p class="oc-error" role="alert">
                            {error}
                        </p>

                        <Button
                            variant="secondary"
                            text="Повторить"
                            onClick={this.load}
                        />
                    </div>
                )}

                {!loading && !error &&
                    items.length === 0 && (
                    <p class="oc-notice">
                        Изменений пока нет
                    </p>
                )}

                {!loading && !error && (
                    <div class="oc-history__list">
                        {items.map(item => (
                            <article
                                key={item.id}
                                class="oc-history__item"
                            >
                                <div class="oc-history__meta">
                                    <div>
                                        <strong>{item.author.name}</strong>

                                        <div class="oc-history__operation">
                                            {item.action === 'create'
                                                ? 'Создание'
                                                : item.action === 'delete'
                                                    ? 'Удаление'
                                                    : 'Изменение'}
                                        </div>
                                    </div>

                                    <time dateTime={item.created_at}>
                                        {new Date(
                                            item.created_at
                                        ).toLocaleString('ru-RU')}
                                    </time>
                                </div>

                                {item.changes.map((change, index) => (
                                    <div
                                        key={index}
                                        class="oc-history__change"
                                    >
                                        <span>
                                            {fieldName(change.field)}
                                        </span>

                                        <div class="oc-history__values">
                                            <span class="oc-history__old">
                                                {formatValue(
                                                    change.field,
                                                    change.old_value
                                                )}
                                            </span>

                                            <span>→</span>

                                            <span class="oc-history__new">
                                                {formatValue(
                                                    change.field,
                                                    change.new_value
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </article>
                        ))}
                    </div>
                )}

                <div class="oc-actions">
                    <Button
                        variant="secondary"
                        text="Закрыть"
                        onClick={onClose}
                    />
                </div>
            </dialog>
        );
    }
}
