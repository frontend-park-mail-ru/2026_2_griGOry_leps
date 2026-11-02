import type { Child } from '@/vdom';
import './alert-banner.scss';

export const AlertBanner = ({ children }: { children?: Child }) => (
    <div class="alert-banner" role="status">
        <span class="alert-banner__icon" aria-hidden="true">!</span>
        <p class="alert-banner__message">{children}</p>
    </div>
);
