import { Button } from '@/components/button/button';
import { Modal } from '@/components/modal/modal';
import './listing-dialog.scss';

export const DeleteBlockedDialog = ({ onClose }: { onClose: () => void }) => (
    <Modal
        title="Сейчас удалить нельзя"
        onClose={onClose}
        footer={<Button text="Понятно" variant="secondary" onClick={onClose} />}
    >
        <p class="listing-dialog__text">
            По этому объявлению есть оформленный заказ. Удалить объявление можно после того,
            как сделка завершится или заказ будет отменён.
        </p>
    </Modal>
);
