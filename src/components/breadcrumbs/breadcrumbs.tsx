import './breadcrumbs.scss';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export const Breadcrumbs = ({ items, flush = false }: { items: BreadcrumbItem[]; flush?: boolean }) => (
    <nav class={flush ? 'breadcrumbs breadcrumbs--flush' : 'breadcrumbs'} aria-label="Хлебные крошки">
        {items.flatMap(({ label, href }, index) => {
            const crumb = href
                ? <a class="breadcrumbs__link" href={href} data-link>{label}</a>
                : <span aria-current="page">{label}</span>;
            return index === 0 ? [crumb] : [<span class="breadcrumbs__sep" aria-hidden="true">/</span>, crumb];
        })}
    </nav>
);
