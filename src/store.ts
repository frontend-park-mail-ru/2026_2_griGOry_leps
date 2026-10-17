import type { User } from '@/lib/api';

export type Listener = (user: User | null) => void;

/** null — гость */
let currentUser: User | null = null;

const listeners: Listener[] = [];

export function setUser(user: User | null): void {
    currentUser = user;
    listeners.forEach((fn) => fn(user));
}

export function clearUser(): void {
    setUser(null);
}

export function getUser(): User | null {
    return currentUser;
}

/** Возвращает функцию отписки */
export function subscribe(fn: Listener): () => void {
    listeners.push(fn);
    return () => {
        const index = listeners.indexOf(fn);
        if (index > -1) listeners.splice(index, 1);
    };
}
