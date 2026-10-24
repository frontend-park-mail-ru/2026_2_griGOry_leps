import { Button } from '@/components/button/button';
import { Modal } from '@/components/modal/modal';
import './listing-dialog.scss';

export interface DeleteListingDialogProps {
    title: string;
    /** Активное объявление лучше снять, чем удалить, — подскажем об этом */
    active: boolean;
    busy: boolean;
    error: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DeleteListingDialog = ({ title, active, busy, error, onConfirm, onCancel }: DeleteListingDialogProps) => (
    <Modal
        title="Удалить объявление?"
        locked={busy}
        onClose={onCancel}
        footer={[
            <Button text="Удалить" variant="danger" disabled={busy} onClick={onConfirm} />,
            <Button text="Отмена" variant="secondary" disabled={busy} onClick={onCancel} />,
        ]}
    >
        <p class="listing-dialog__text">
            «{title || 'Без названия'}» удалится навсегда вместе со статистикой.
            {active && ' Если планируете вернуть его позже, лучше снимите с продажи.'}
        </p>
        {error && <p class="listing-dialog__error" role="alert">{error}</p>}
    </Modal>
);
