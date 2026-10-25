import type { Child } from '@/vdom';
import './footer.scss';

/** Разделов пока нет */
const DisabledLink = ({ children, small = false }: { children?: Child; small?: boolean }) => (
    <span
        class={small ? 'footer__link footer__link--small footer__link--disabled' : 'footer__link footer__link--disabled'}
        aria-disabled="true"
    >{children}</span>
);

const COLUMNS = [
    { title: 'Покупателям', links: ['Как купить', 'Безопасная сделка', 'Доставка', 'Избранное'] },
    { title: 'Продавцам', links: ['Разместить объявление', 'Правила размещения', 'Продвижение'] },
    { title: 'GoGET', links: ['О проекте', 'Помощь', 'Контакты'] },
];

export const Footer = () => (
    <footer class="footer">
        <div class="footer__top">
            <div class="footer__brand">
                <a href="/" data-link class="footer__logo">
                    <img class="footer__logo-image" src="/img/goget-mono.svg" alt="GoGET" width="89" height="40" />
                </a>
                <p class="footer__tagline">Покупайте и продавайте рядом с домом — быстро и без посредников</p>
            </div>

            <nav class="footer__cols" aria-label="Меню в подвале">
                {COLUMNS.map(({ title, links }) => (
                    <div key={title} class="footer__col">
                        <h4 class="footer__heading">{title}</h4>
                        {links.map((link) => <DisabledLink key={link}>{link}</DisabledLink>)}
                    </div>
                ))}
            </nav>
        </div>

        <div class="footer__bottom">
            <span>© {new Date().getFullYear()} GoGET</span>
            <span class="footer__legal">
                <DisabledLink small>Политика конфиденциальности</DisabledLink>
                <a href="/terms" data-link class="footer__link footer__link--small">Условия использования</a>
            </span>
        </div>
    </footer>
);
