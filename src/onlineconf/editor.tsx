import { Component } from 'goget-vdom';
import { Button } from '@/components/button/button';
import { FormField } from '@/components/form-field/form-field';
import { denied, errorText, saveEntry, scopes, type Kind, type Scope, type Entry } from './api';
import { makeDraft, parseDraft } from './values';

interface Props {
    kind: Kind;
    scope: Scope;
    entry?: Entry;
    onClose: () => void;
    onSaved: () => void;
    onDenied: () => void;
}

type Draft = ReturnType<typeof makeDraft>;

export class Editor extends Component<Props, { draft: Draft; error: string; saving: boolean }> {
    state = { draft: makeDraft(this.props.kind, this.props.entry, this.props.scope), error: '', saving: false };
    private dialog: HTMLDialogElement | null = null;
    private setDialog = (el: HTMLElement | null) => { this.dialog = el as HTMLDialogElement | null; };

    componentDidMount() { this.dialog?.showModal(); }
    componentWillUnmount() { this.dialog?.close(); }

    change = (key: keyof Draft) => (event: Event) => {
        const field = event.currentTarget as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        this.setState(({ draft }) => ({ draft: { ...draft, [key]: field.value }, error: '' }));
    };

    save = async (event: Event) => {
        event.preventDefault();
        if (this.state.saving) return;

        const { kind, entry, onSaved, onDenied } = this.props;
        let values;
        try {
            values = parseDraft(kind, this.state.draft);
        } catch (error) {
            this.setState({ error: (error as Error).message });
            return;
        }

        this.setState({ saving: true, error: '' });
        try {
            await saveEntry(kind, values, entry?.id);
            onSaved();
        } catch (error) {
            if (denied(error)) onDenied();
            else this.setState({
                saving: false,
                error: errorText(error, 'Сохранение не подтверждено. Проверьте соединение и список записей.'),
            });
        }
    };

    render() {
        const { kind, entry, onClose } = this.props;
        const { draft, saving, error } = this.state;
        const title = kind === 'config'
            ? (entry ? 'Редактировать конфиг' : 'Новый конфиг')
            : (entry ? 'Редактировать фича-флаг' : 'Новый фича-флаг');

        return (
            <dialog ref={this.setDialog} class="oc-editor" aria-labelledby="oc-title"
                onCancel={(e: Event) => { e.preventDefault(); if (!saving) onClose(); }}>
                <form onSubmit={this.save}>
                    <h2 class="oc-editor__title" id="oc-title">{title}</h2>
                    <fieldset class="oc-fields" disabled={saving}>
                        <FormField id="oc-name" name="name" label="Название"
                            value={draft.name} onInput={this.change('name')} />

                        <label class="oc-field">Скоуп
                            <select class="oc-control" onChange={this.change('scope')}>
                                {scopes.map(s => <option key={s} value={s} selected={s === draft.scope}>{s}</option>)}
                            </select>
                        </label>

                        {kind === 'config' ? (
                            <label class="oc-field">Значение JSON
                                <textarea class="oc-control oc-json" rows={6} spellcheck="false"
                                    placeholder='{"limit": 24}' value={draft.json} onInput={this.change('json')} />
                            </label>
                        ) : (
                            <>
                                <FormField id="oc-percent" name="percent" label="Раскатка, %" inputmode="numeric"
                                    value={draft.percent} onInput={this.change('percent')} />
                                <FormField id="oc-include" name="include" label="Всегда включён для"
                                    placeholder="ID через запятую" value={draft.include} onInput={this.change('include')} />
                                <FormField id="oc-exclude" name="exclude" label="Всегда выключен для"
                                    placeholder="ID через запятую"
                                    hint="Если ID есть в обоих списках, флаг будет выключен."
                                    value={draft.exclude} onInput={this.change('exclude')} />
                            </>
                        )}
                    </fieldset>

                    {error && <p class="oc-error" role="alert">{error}</p>}

                    <div class="oc-actions">
                        <Button variant="secondary" text="Отмена" disabled={saving} onClick={onClose} />
                        <Button type="submit" text={saving ? 'Сохраняем…' : 'Сохранить'} disabled={saving} />
                    </div>
                </form>
            </dialog>
        );
    }
}
