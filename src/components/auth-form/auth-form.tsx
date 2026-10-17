import type { Child } from '@/vdom';
import './auth-form.scss';

export interface AuthFormProps {
    id: string;
    /** Ошибка не про конкретное поле, показывается над кнопкой */
    error?: string;
    onSubmit: (event: SubmitEvent) => void;
    footer: Child;
    children?: Child;
}

export const AuthForm = ({ id, error, onSubmit, footer, children }: AuthFormProps) => (
    <form class="auth-form" id={id} novalidate onSubmit={onSubmit}>
        <div class="auth-form__fields">{children}</div>

        <p class="auth-form__error" role="alert">{error || null}</p>

        {footer}
    </form>
);
