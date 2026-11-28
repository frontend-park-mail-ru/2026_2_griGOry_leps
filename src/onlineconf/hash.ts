import { scopes, type Kind, type Scope } from './api';

export interface HashFilter {
    kind: Kind;
    scope: Scope | '';
    name: string;
}

/**
 * Вкладка и фильтры живут в решётке: `#flags?scope=search&name=sort`.
 * Сервер её не видит, поэтому /admin открывается одинаково с любым фильтром.
 */
export function readHash(hash: string): HashFilter {
    const [tab, search = ''] = hash.replace(/^#/, '').split(/\?(.*)/s);
    const params = new URLSearchParams(search);
    const scope = params.get('scope');

    return {
        kind: tab === 'flags' ? 'flag' : 'config',
        scope: scopes.find(item => item === scope) ?? '',
        name: params.get('name') ?? '',
    };
}

export function hashFor(kind: Kind, scope: Scope | '', name: string): string {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);
    if (name.trim()) params.set('name', name.trim());

    const tab = kind === 'flag' ? '#flags' : '#configs';
    return params.size ? `${tab}?${params}` : tab;
}
