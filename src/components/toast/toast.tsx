import type { ToastMessage } from '@/lib/toast';
import './toast.scss';

const ICONS = { success: '✓', info: 'i', error: '!' };

export const Toast = ({ toast }: { toast: ToastMessage | null }) => (
    <div class="toast-region" role="status" aria-live="polite">
        {toast && (
            <div key={toast.id} class={`toast toast--${toast.kind}`}>
                <span class="toast__icon" aria-hidden="true">{ICONS[toast.kind]}</span>
                {toast.text}
            </div>
        )}
    </div>
);
