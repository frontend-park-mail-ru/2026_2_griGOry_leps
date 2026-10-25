import type { Child } from '@/vdom';
import type { Profile } from '@/lib/api';
import { ProfileSidebar, type ProfileSection } from '@/components/profile-sidebar/profile-sidebar';
import './profile-layout.scss';

export interface ProfileLayoutProps {
    profile: Profile;
    active: ProfileSection;
    listingsCount: number | null;
    onLogout: () => Promise<void>;
    children?: Child;
}

export const ProfileLayout = ({ profile, active, listingsCount, onLogout, children }: ProfileLayoutProps) => (
    <div class="profile-layout">
        <div class="profile-layout__inner">
            <ProfileSidebar profile={profile} active={active} listingsCount={listingsCount} onLogout={onLogout} />
            {children}
        </div>
    </div>
);
