import { Component } from '@/vdom';
import type { CloseReason } from '@/lib/api';
import { Modal } from '@/components/modal/modal';
import './close-listing-modal.scss';

export interface CloseListingModalProps {
    pending: boolean;
    error: string;
    onConfirm: (reason: CloseReason) => void;
    onClose: () => void;
}

export interface CloseListingModalState {
    reason: CloseReason | null;
}

const REASONS: { value: CloseReason; title: string; description?: string }[] = [
    { value: 'sold_on_goget', title: 'Продал на GoGet', description: 'Покупатель сможет оставить отзыв' },
    { value: 'sold_elsewhere', title: 'Продал в другом месте' },
    { value: 'changed_mind', title: 'Передумал продавать' },
    { value: 'other', title: 'Другая причина' },
];

export class CloseListingModal extends Component<CloseListingModalProps, CloseListingModalState> {
    state: CloseListingModalState = { reason: null };

    handleConfirm = () => {
        if (this.state.reason) this.props.onConfirm(this.state.reason);
    };

    render() {
        const { pending, error, onClose } = this.props;
        const { reason } = this.state;

        return (
            <Modal
                title="Снять с продажи"
                description="Расскажите, почему снимаете объявление. Оно перейдёт во вкладку «Снятые», а покупатели перестанут его видеть."
                onClose={onClose}
                actions={(
                    <>
                        <button
                            type="button"
                            class="close-listing-modal__confirm"
                            disabled={!reason || pending}
                            onClick={this.handleConfirm}
                        >Снять с продажи</button>
                        <button type="button" class="close-listing-modal__cancel" disabled={pending} onClick={onClose}>Отмена</button>
                    </>
                )}
            >
                <div class="close-listing-modal__reasons" role="radiogroup" aria-label="Причина">
                    {REASONS.map(({ value, title, description }) => (
                        <label
                            key={value}
                            class={value === reason
                                ? 'close-listing-modal__option close-listing-modal__option--selected'
                                : 'close-listing-modal__option'}
                        >
                            <input
                                type="radio"
                                name="close-reason"
                                value={value}
                                class="close-listing-modal__radio"
                                checked={value === reason}
                                disabled={pending}
                                onChange={() => this.setState({ reason: value })}
                            />
                            <span class="close-listing-modal__text">
                                <span class="close-listing-modal__title">{title}</span>
                                {description && <span class="close-listing-modal__description">{description}</span>}
                            </span>
                        </label>
                    ))}
                </div>
                {error && <p class="close-listing-modal__error" role="alert">{error}</p>}
            </Modal>
        );
    }
}
