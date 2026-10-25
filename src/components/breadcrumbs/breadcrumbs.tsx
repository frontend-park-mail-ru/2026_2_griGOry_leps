import './breadcrumbs.scss';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    flush?: boolean;
    strong?: boolean;
}

export const Breadcrumbs = ({ items, flush = false, strong = false }: BreadcrumbsProps) => (
    <nav
        class={['breadcrumbs', flush && 'breadcrumbs--flush', strong && 'breadcrumbs--strong'].filter(Boolean).join(' ')}
        aria-label="Хлебные крошки"
    >
        {items.flatMap(({ label, href }, index) => {
            const crumb = href
                ? <a class="breadcrumbs__link" href={href} data-link>{label}</a>
                : <span aria-current="page">{label}</span>;
            return index === 0 ? [crumb] : [<span class="breadcrumbs__sep" aria-hidden="true">/</span>, crumb];
        })}
    </nav>
);
