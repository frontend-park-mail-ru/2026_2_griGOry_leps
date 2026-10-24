import { Component } from '@/vdom';
import { Button } from '@/components/button/button';
import { Modal } from '@/components/modal/modal';
import type { CloseReason } from '@/lib/api';
import { CLOSE_REASON_LABELS } from '@/lib/listing';
import './listing-dialog.scss';

const REASONS = Object.keys(CLOSE_REASON_LABELS) as CloseReason[];

const REASON_HINTS: Partial<Record<CloseReason, string>> = {
    sold_on_goget: 'Покупатель сможет оставить отзыв',
};

export interface CloseListingDialogProps {
    busy: boolean;
    error: string;
    onSubmit: (reason: CloseReason) => void;
    onCancel: () => void;
}

export class CloseListingDialog extends Component<CloseListingDialogProps, { reason: CloseReason | ''; missing: boolean }> {
    state = { reason: '' as CloseReason | '', missing: false };

    handleChange = (e: Event) => {
        this.setState({ reason: (e.target as HTMLInputElement).value as CloseReason, missing: false });
    };

    handleSubmit = () => {
        const { reason } = this.state;
        if (reason) this.props.onSubmit(reason);
        else this.setState({ missing: true });
    };

    render() {
        const { busy, error, onCancel } = this.props;
        const { reason, missing } = this.state;
        const message = missing ? 'Выберите причину' : error;

        return (
            <Modal
                title="Снять с продажи?"
                locked={busy}
                onClose={onCancel}
                footer={[
                    <Button text="Снять с продажи" disabled={busy} onClick={this.handleSubmit} />,
                    <Button text="Отмена" variant="secondary" disabled={busy} onClick={onCancel} />,
                ]}
            >
                <p class="listing-dialog__text">
                    Объявление пропадёт из поиска. Почему снимаете? Причину видите только вы.
                </p>
                <fieldset class="listing-dialog__reasons">
                    <legend class="visually-hidden">Причина</legend>
                    {REASONS.map((item) => (
                        <label
                            key={item}
                            class={reason === item ? 'listing-dialog__reason listing-dialog__reason--checked' : 'listing-dialog__reason'}
                        >
                            <input
                                type="radio"
                                name="close-reason"
                                value={item}
                                checked={reason === item}
                                onChange={this.handleChange}
                            />
                            <span class="listing-dialog__reason-text">
                                {CLOSE_REASON_LABELS[item]}
                                {REASON_HINTS[item] && <span class="listing-dialog__reason-hint">{REASON_HINTS[item]}</span>}
                            </span>
                        </label>
                    ))}
                </fieldset>
                {message && <p class="listing-dialog__error" role="alert">{message}</p>}
            </Modal>
        );
    }
}
