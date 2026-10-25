import type { User } from '@/lib/api';
import './user-avatar.scss';

export const AVATAR_COLORS = [
    '#0866ff',
    '#21a152',
    '#f26b1d',
    '#db2626',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#b45309',
    '#4f46e5',
    '#0d9488',
] as const;

export type AvatarUser = Pick<User, 'id' | 'first_name' | 'email'> & { avatar_url?: string | null };

export interface UserAvatarProps {
    user: AvatarUser;
    class?: string;
}

export function getAvatarLetter(user: AvatarUser): string {
    const [letter = '?'] = Array.from((user.first_name || user.email || '').trim());
    return letter.toUpperCase();
}

export function getAvatarColor(id: number): string {
    return AVATAR_COLORS[Math.abs(Math.trunc(id)) % AVATAR_COLORS.length];
}

export const UserAvatar = ({ user, class: className }: UserAvatarProps) => {
    const mix = className ? ` ${className}` : '';

    if (user.avatar_url) {
        return <img class={`user-avatar${mix}`} src={user.avatar_url} alt={user.first_name || user.email} />;
    }

    return (
        <span
            class={`user-avatar user-avatar--letter${mix}`}
            style={{ backgroundColor: getAvatarColor(user.id) }}
            aria-hidden="true"
        >
            {getAvatarLetter(user)}
        </span>
    );
};
