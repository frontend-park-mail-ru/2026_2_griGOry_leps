import { Modal } from '@/components/modal/modal';
import './delete-blocked-modal.scss';

export const DeleteBlockedModal = ({ onClose }: { onClose: () => void }) => (
    <Modal
        title="Сейчас удалить нельзя"
        description="По этому объявлению есть оформленный заказ. Удалить объявление можно после того, как сделка завершится или заказ будет отменён."
        onClose={onClose}
        actions={<button type="button" class="delete-blocked-modal__ok" onClick={onClose}>Понятно</button>}
    />
);
