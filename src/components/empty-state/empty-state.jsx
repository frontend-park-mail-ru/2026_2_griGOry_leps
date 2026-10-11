import './empty-state.scss';

/**
 * Заглушка для пустых списков.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.text
 * @param {{label: string, href?: string, disabled?: boolean}} [props.action] Кнопка или ссылка под текстом
 */
export const EmptyState = ({ title, text, action }) => (
    <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">
            <img src="/img/sparkles.svg" alt="" />
        </div>
        <h2 class="empty-state__title">{title}</h2>
        <p class="empty-state__text">{text}</p>
        {action && (action.disabled
            ? <button type="button" class="empty-state__action" disabled>{action.label}</button>
            : <a href={action.href} data-link class="empty-state__action">{action.label}</a>
        )}
    </div>
);
