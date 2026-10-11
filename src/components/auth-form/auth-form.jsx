import './auth-form.scss';

/**
 * Форма входа/регистрации: поля (children), общая ошибка над кнопкой и подвал (кнопка, подпись).
 * @param {Object} props
 * @param {string} props.id
 * @param {string} [props.error] Общая ошибка формы, не относящаяся к конкретному полю
 * @param {function(SubmitEvent): void} props.onSubmit
 * @param {*} props.footer
 * @param {*} props.children Поля формы
 */
export const AuthForm = ({ id, error, onSubmit, footer, children }) => (
    <form class="auth-form" id={id} novalidate onSubmit={onSubmit}>
        <div class="auth-form__fields">{children}</div>

        <p class="auth-form__error" role="alert">{error || null}</p>

        {footer}
    </form>
);
