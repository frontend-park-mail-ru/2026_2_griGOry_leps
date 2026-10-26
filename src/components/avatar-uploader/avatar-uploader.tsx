import { Component } from '@/vdom';
import { uploadAvatar } from '@/lib/api';
import { describeApiError } from '@/lib/form';
import { logError } from '@/lib/logger';
import { UserAvatar, type AvatarUser } from '@/components/user-avatar/user-avatar';
import './avatar-uploader.scss';

const AVATAR_TYPES = ['image/jpeg', 'image/png'];

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const AVATAR_TYPE_ERROR = 'Можно загрузить только JPG или PNG';

const AVATAR_SIZE_ERROR = 'Файл больше 5 МБ. Выберите фото поменьше';

const CameraIcon = () => (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3.33 6.67c0-.92.75-1.67 1.67-1.67h1.67l1.25-1.67h4.16l1.25 1.67H15c.92 0 1.67.75 1.67 1.67v8.33c0 .92-.75 1.67-1.67 1.67H5c-.92 0-1.67-.75-1.67-1.67V6.67Z" />
        <circle cx="10" cy="10.83" r="2.75" />
    </svg>
);

export interface AvatarUploaderProps {
    user: AvatarUser;
    onUploaded: (avatarUrl: string | null) => void;
}

export interface AvatarUploaderState {
    uploading: boolean;
    error: string;
}

export class AvatarUploader extends Component<AvatarUploaderProps, AvatarUploaderState> {
    state: AvatarUploaderState = { uploading: false, error: '' };

    fileInput: HTMLInputElement | null = null;

    openFilePicker = () => {
        this.fileInput?.click();
    };

    handleChange = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;

        if (!AVATAR_TYPES.includes(file.type)) {
            this.setState({ error: AVATAR_TYPE_ERROR });
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            this.setState({ error: AVATAR_SIZE_ERROR });
            return;
        }

        this.setState({ uploading: true, error: '' });
        try {
            const { avatar_url } = await uploadAvatar(file);
            this.props.onUploaded(avatar_url);
        } catch (err) {
            logError('Не удалось загрузить аватарку:', err);
            const { message } = describeApiError(err, {
                fields: [],
                fallback: 'Не удалось загрузить фото. Попробуйте ещё раз',
                byStatus: {
                    400: 'Не удалось прочитать файл. Выберите другое фото',
                    413: AVATAR_SIZE_ERROR,
                    415: AVATAR_TYPE_ERROR,
                },
            });
            this.setState({ error: message });
        } finally {
            this.setState({ uploading: false });
        }
    };

    render() {
        const { user } = this.props;
        const { uploading, error } = this.state;

        return (
            <div class="avatar-uploader">
                <UserAvatar user={user} class="avatar-uploader__avatar" />
                <div class="avatar-uploader__actions">
                    <button
                        type="button"
                        class="avatar-uploader__button"
                        disabled={uploading}
                        onClick={this.openFilePicker}
                    >
                        <CameraIcon />
                        {uploading ? 'Загружаем фото…' : 'Изменить фото'}
                    </button>
                    <input
                        ref={(el) => { this.fileInput = el as HTMLInputElement | null; }}
                        class="avatar-uploader__file"
                        type="file"
                        accept={AVATAR_TYPES.join(',')}
                        tabindex="-1"
                        aria-hidden="true"
                        onChange={this.handleChange}
                    />
                    {error
                        ? <span class="avatar-uploader__hint avatar-uploader__hint--error" role="alert">{error}</span>
                        : <span class="avatar-uploader__hint">JPG или PNG, до 5 МБ</span>}
                </div>
            </div>
        );
    }
}
