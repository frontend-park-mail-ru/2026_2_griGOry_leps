import './page-error.scss';
import { EmptyState } from '@/components/empty-state/empty-state.jsx';

/**
 * Заглушка вместо страницы, данные для которой не загрузились.
 * @param {{onRetry: function(): void}} props
 */
export const PageError = ({ onRetry }) => (
    <div class="page-error" role="alert">
        <EmptyState
            title="Произошла ошибка при загрузке страницы"
            text="Проверьте подключение к интернету и попробуйте ещё раз"
            action={{ label: 'Попробовать ещё раз', onClick: onRetry }}
        />
    </div>
);
