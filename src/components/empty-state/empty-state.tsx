import './empty-state.scss';

export interface EmptyStateProps {
    title: string;
    text: string;
    iconSrc?: string;
    /** С href — ссылка, иначе кнопка */
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
        disabled?: boolean;
    };
    emoji?: string;
    card?: boolean;
}

export const EmptyState = ({ title, text, action, emoji, card = false }: EmptyStateProps) => (
    <div class={card ? 'empty-state empty-state--card' : 'empty-state'}>
        {emoji
            ? <span class="empty-state__emoji" aria-hidden="true">{emoji}</span>
            : (
                <div class="empty-state__icon" aria-hidden="true">
                    <img class="empty-state__icon-image" src="/img/sparkles.svg" alt="" />
                </div>
            )}
        <h2 class="empty-state__title">{title}</h2>
        <p class="empty-state__text">{text}</p>
        {action && (action.href && !action.disabled
            ? <a href={action.href} data-link class="empty-state__action">{action.label}</a>
            : (
                <button type="button" class="empty-state__action" disabled={action.disabled} onClick={action.onClick}>
                    {action.label}
                </button>
            )
        )}
    </div>
);
