import './page-error.scss';
import { EmptyState } from '@/components/empty-state/empty-state';

interface PageErrorProps {
    onRetry: () => void;
    network?: boolean;
}

export const PageError = ({ onRetry, network = false }: PageErrorProps) => (
    <div class="page-error" role="alert">
        <EmptyState
            iconSrc={network ? '/img/antenna.png' : undefined}
            title={network ? 'Нет соединения' : 'Произошла ошибка при загрузке страницы'}
            text={network
                ? 'Эта страница не сохранена для просмотра без интернета. Проверьте подключение и попробуйте снова.'
                : 'Не удалось загрузить страницу. Попробуйте ещё раз.'}
            action={{ label: network ? 'Обновить' : 'Попробовать ещё раз', onClick: onRetry }}
        />
    </div>
);
