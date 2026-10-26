import { Component } from '@/vdom';
import type { ReportReason } from '@/lib/api';
import { Modal } from '@/components/modal/modal';
import { TextareaField } from '@/components/textarea-field/textarea-field';
import './report-seller-modal.scss';

export const REPORT_COMMENT_MAX = 500;

export interface ReportSellerModalProps {
    pending: boolean;
    error: string;
    onConfirm: (reason: ReportReason, comment: string) => void;
    onClose: () => void;
}

export interface ReportSellerModalState {
    reason: ReportReason | null;
    comment: string;
}

const REASONS: { value: ReportReason; title: string }[] = [
    { value: 'fraud', title: 'Мошенничество' },
    { value: 'prohibited', title: 'Продаёт запрещённые товары' },
    { value: 'rude', title: 'Грубость или оскорбления' },
    { value: 'other', title: 'Другое' },
];

export class ReportSellerModal extends Component<ReportSellerModalProps, ReportSellerModalState> {
    state: ReportSellerModalState = { reason: null, comment: '' };

    handleConfirm = () => {
        const { reason, comment } = this.state;
        if (reason) this.props.onConfirm(reason, comment.trim());
    };

    handleComment = (e: Event) => {
        this.setState({ comment: (e.target as HTMLTextAreaElement).value });
    };

    render() {
        const { pending, error, onClose } = this.props;
        const { reason, comment } = this.state;

        return (
            <Modal
                title="Пожаловаться на продавца"
                description="Модераторы проверят жалобу в течение суток. Продавец не узнает, кто её отправил."
                onClose={onClose}
                actions={(
                    <>
                        <button
                            type="button"
                            class="report-seller-modal__confirm"
                            disabled={!reason || pending}
                            onClick={this.handleConfirm}
                        >Отправить жалобу</button>
                        <button type="button" class="report-seller-modal__cancel" disabled={pending} onClick={onClose}>Отмена</button>
                    </>
                )}
            >
                <div class="report-seller-modal__reasons" role="radiogroup" aria-label="Причина жалобы">
                    {REASONS.map(({ value, title }) => (
                        <label
                            key={value}
                            class={value === reason
                                ? 'report-seller-modal__option report-seller-modal__option--selected'
                                : 'report-seller-modal__option'}
                        >
                            <input
                                type="radio"
                                name="report-reason"
                                value={value}
                                class="report-seller-modal__radio"
                                checked={value === reason}
                                disabled={pending}
                                onChange={() => this.setState({ reason: value })}
                            />
                            <span class="report-seller-modal__title">{title}</span>
                        </label>
                    ))}
                </div>
                <TextareaField
                    id="report-comment"
                    name="comment"
                    ariaLabel="Комментарий к жалобе"
                    placeholder="Опишите, что произошло"
                    maxLength={REPORT_COMMENT_MAX}
                    height={100}
                    value={comment}
                    disabled={pending}
                    onInput={this.handleComment}
                />
                {error && <p class="report-seller-modal__error" role="alert">{error}</p>}
            </Modal>
        );
    }
}
