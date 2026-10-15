import type { Child } from '@/vdom';
import './auth-card.scss';

export interface AuthCardProps {
    title: string;
    subtitle?: string;
    children?: Child;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => (
    <section class="auth-card">
        <header class="auth-card__heading">
            <h1 class="auth-card__title">{title}</h1>
            {subtitle && <p class="auth-card__subtitle">{subtitle}</p>}
        </header>
        {children}
    </section>
);
