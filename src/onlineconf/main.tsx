import { render } from 'goget-vdom';
import { Footer } from '@/components/footer/footer';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import '@/components/header/header.scss';
import { getMe, type User } from '@/lib/api';
import { EntriesSearch } from './entries-search/entries-search';
import { readHash, type HashFilter } from './hash';
import './style.scss';

function Admin({ filter, user }: { filter: HashFilter; user: User | null }) {
    return (
        <div class="oc-layout">
            <header class="header">
                <div class="oc-bar">
                    <a class="oc-brand" href="/" aria-label="На главную GoGet">
                        <img src="/img/goget.svg" alt="GoGet" width="88" height="40" />
                        <span class="oc-brand__name">OnlineConf</span>
                    </a>

                    {user && (
                        <details class="oc-account">
                            <summary class="oc-account__toggle" aria-label="Меню профиля">
                                <UserAvatar user={user} />
                                <img src="/img/chevron-down.svg" alt="" width="16" height="16" />
                            </summary>
                            <div class="oc-account__menu">
                                <strong>{user.first_name || user.email}</strong>
                                <a class="oc-link" href="/profile/edit">Настройки профиля</a>
                            </div>
                        </details>
                    )}
                </div>
            </header>

            <main class="oc-board">
                <EntriesSearch {...filter} />
            </main>
            <Footer />
        </div>
    );
}

let user: User | null = null;
let filter = readHash(location.hash);
let navigationId = 0;

function showTab() {
    render(document.getElementById('app')!, <Admin key={navigationId} filter={filter} user={user} />);
}

window.addEventListener('hashchange', () => {
    navigationId++;
    filter = readHash(location.hash);
    showTab();
});
showTab();

void getMe().then(me => {
    user = me;
    showTab();
}).catch(() => {
});
