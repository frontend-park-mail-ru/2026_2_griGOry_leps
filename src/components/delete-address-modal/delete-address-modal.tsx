import type { Address } from '@/lib/api';
import { formatAddress } from '@/lib/format';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';

export interface DeleteAddressModalProps {
    address: Address;
    pending: boolean;
    error: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const DeleteAddressModal = ({ address, pending, error, onConfirm, onClose }: DeleteAddressModalProps) => (
    <ConfirmModal
        title="Удалить адрес?"
        description={`«${formatAddress(address)}» пропадёт из списка адресов доставки.`}
        confirmLabel="Удалить"
        pending={pending}
        error={error}
        onConfirm={onConfirm}
        onClose={onClose}
    />
);
