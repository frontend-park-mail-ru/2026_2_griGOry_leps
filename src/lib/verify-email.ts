import { resendVerification } from '@/lib/api';
import { describeApiError } from '@/lib/form';
import { logWarn } from '@/lib/logger';
import { showToast } from '@/lib/toast';

export async function resendVerificationEmail(): Promise<void> {
    try {
        const email = await resendVerification();
        showToast(`Отправили письмо на ${email}. Перейдите по ссылке и вернитесь к заказу`);
    } catch (err) {
        logWarn('Не удалось отправить письмо для подтверждения:', err);
        const { message } = describeApiError(err, { fields: [], fallback: 'Не удалось отправить письмо. Попробуйте ещё раз' });
        showToast(message, 'error');
    }
}
