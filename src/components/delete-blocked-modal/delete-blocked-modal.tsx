import { Modal } from '@/components/modal/modal';
import './delete-blocked-modal.scss';

export const DeleteBlockedModal = ({ onClose }: { onClose: () => void }) => (
    <Modal
        title="Сейчас удалить нельзя"
        description="Покупатель сейчас оплачивает заказ с этим товаром. Удалить объявление можно, когда оплата пройдёт или заказ отменится."
        onClose={onClose}
        actions={<button type="button" class="delete-blocked-modal__ok" onClick={onClose}>Понятно</button>}
    />
);
