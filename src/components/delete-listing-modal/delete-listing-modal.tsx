import { Modal } from '@/components/modal/modal';
import './delete-listing-modal.scss';

export interface DeleteListingModalProps {
    title: string;
    pending: boolean;
    error: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const DeleteListingModal = ({ title, pending, error, onConfirm, onClose }: DeleteListingModalProps) => (
    <Modal
        title="Удалить объявление?"
        description={`«${title || 'Без названия'}» будет удалено навсегда вместе с фотографиями. Восстановить его не получится.`}
        onClose={onClose}
        actions={(
            <>
                <button type="button" class="delete-listing-modal__confirm" disabled={pending} onClick={onConfirm}>Удалить</button>
                <button type="button" class="delete-listing-modal__cancel" disabled={pending} onClick={onClose}>Отмена</button>
            </>
        )}
    >
        {error && <p class="delete-listing-modal__error" role="alert">{error}</p>}
    </Modal>
);
