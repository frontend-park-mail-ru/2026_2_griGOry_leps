import './auth-card.scss';

/**
 * Карточка входа/регистрации: заголовок, подзаголовок и содержимое (вкладки, форма).
 * @param {{title: string, subtitle?: string, children?: *}} props
 */
export const AuthCard = ({ title, subtitle, children }) => (
    <section class="auth-card">
        <header class="auth-card__heading">
            <h1 class="auth-card__title">{title}</h1>
            {subtitle && <p class="auth-card__subtitle">{subtitle}</p>}
        </header>
        {children}
    </section>
);
