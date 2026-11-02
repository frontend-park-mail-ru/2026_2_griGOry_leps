import type { Child } from '@/vdom';
import './auth-card.scss';

export type AuthCardIcon = 'mail' | 'expired' | 'success';

const ICON_PATHS: Record<AuthCardIcon, Child> = {
    mail: [
        <rect x="3" y="5" width="18" height="14" rx="2" />,
        <path d="m3 7 9 6 9-6" />,
    ],
    expired: [
        <path d="M12 5v9" />,
        <circle cx="12" cy="18.5" r="0.6" fill="currentColor" />,
    ],
    success: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

export interface AuthCardProps {
    title: string;
    subtitle?: string;
    icon?: AuthCardIcon;
    children?: Child;
}

export const AuthCard = ({ title, subtitle, icon, children }: AuthCardProps) => (
    <section class={icon ? `auth-card auth-card--status auth-card--${icon}` : 'auth-card'}>
        <header class="auth-card__heading">
            {icon && (
                <span class="auth-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        {ICON_PATHS[icon]}
                    </svg>
                </span>
            )}
            <h1 class="auth-card__title">{title}</h1>
            {subtitle && <p class="auth-card__subtitle">{subtitle}</p>}
        </header>
        {children}
    </section>
);
