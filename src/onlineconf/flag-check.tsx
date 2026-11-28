import { Component } from 'goget-vdom';
import { Button } from '@/components/button/button';
import { checkFlag, errorText } from './api';

export class FlagCheck extends Component<{ entryID: number }, { open: boolean; id: string; status: string }> {
    state = { open: false, id: '', status: '' };
    private revision = 0;

    componentWillUnmount() { this.revision++; }

    submit = async (event: Event) => {
        event.preventDefault();
        const revision = ++this.revision;
        const id = Number(this.state.id);
        if (!/^\d+$/.test(this.state.id) || id < 1 || id > 2147483647) {
            this.setState({ status: 'Введите положительный ID до 2147483647.' });
            return;
        }
        this.setState({ status: 'Проверяем…' });
        try {
            const enabled = await checkFlag(this.props.entryID, id);
            if (revision === this.revision) this.setState({ status: enabled ? 'Включён' : 'Выключен' });
        } catch (error) {
            if (revision === this.revision) this.setState({ status: errorText(error, 'Не удалось проверить флаг.') });
        }
    };

    render() {
        if (!this.state.open) return <Button text="Проверить по ID" variant="outline" onClick={() => this.setState({ open: true })} />;
        return <form onSubmit={this.submit}>
            <label>ID пользователя
                <input class="oc-control" value={this.state.id} onInput={(event: Event) => {
                    this.revision++;
                    this.setState({ id: (event.target as HTMLInputElement).value, status: '' });
                }} />
            </label>
            <Button type="submit" text="Проверить" variant="secondary" />
            <span role="status">{this.state.status}</span>
        </form>;
    }
}
