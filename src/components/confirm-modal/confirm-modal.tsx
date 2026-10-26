import { Modal } from '@/components/modal/modal';
import './confirm-modal.scss';

export interface ConfirmModalProps {
    title: string;
    description: string;
    confirmLabel: string;
    pending: boolean;
    error: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmModal = ({ title, description, confirmLabel, pending, error, onConfirm, onClose }: ConfirmModalProps) => (
    <Modal
        title={title}
        description={description}
        onClose={onClose}
        actions={(
            <>
                <button type="button" class="confirm-modal__confirm" disabled={pending} onClick={onConfirm}>{confirmLabel}</button>
                <button type="button" class="confirm-modal__cancel" disabled={pending} onClick={onClose}>Отмена</button>
            </>
        )}
    >
        {error && <p class="confirm-modal__error" role="alert">{error}</p>}
    </Modal>
);
