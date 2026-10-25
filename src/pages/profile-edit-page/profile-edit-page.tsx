import { Component } from '@/vdom';
import {
    getCities,
    getMyListings,
    updateProfile,
    uploadAvatar,
    type City,
    type Profile,
} from '@/lib/api';
import { FormValidation, describeApiError, type FieldRule, type FormValues } from '@/lib/form';
import {
    LIMITS,
    sanitizePhone,
    validateAbout,
    validateEmail,
    validateName,
    validatePhone,
} from '@/lib/validators';
import { logError, logWarn } from '@/lib/logger';
import { setUser } from '@/store';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import { FormField } from '@/components/form-field/form-field';
import { UserAvatar } from '@/components/user-avatar/user-avatar';
import { Toast, type ToastType } from '@/components/toast/toast';
import './profile-edit-page.scss';

const RULES: Record<string, FieldRule> = {
    first_name: { validate: validateName, required: 'Введите имя' },
    phone: { validate: validatePhone, sanitize: sanitizePhone, required: 'Введите телефон' },
    email: { validate: validateEmail, required: 'Введите email' },
    about: { validate: validateAbout },
};

const API_FIELDS = [...Object.keys(RULES), 'city_id'];

const AVATAR_TYPES = ['image/jpeg', 'image/png'];

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const AVATAR_TYPE_ERROR = 'Можно загрузить только JPG или PNG';

const AVATAR_SIZE_ERROR = 'Файл больше 5 МБ. Выберите фото поменьше';

const TOAST_DURATION_MS = 4000;

const CameraIcon = () => (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3.33 6.67c0-.92.75-1.67 1.67-1.67h1.67l1.25-1.67h4.16l1.25 1.67H15c.92 0 1.67.75 1.67 1.67v8.33c0 .92-.75 1.67-1.67 1.67H5c-.92 0-1.67-.75-1.67-1.67V6.67Z" />
        <circle cx="10" cy="10.83" r="2.75" />
    </svg>
);

function profileValues(profile: Profile): FormValues {
    return {
        first_name: profile.first_name ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        about: profile.about ?? '',
    };
}

function profileCityId(profile: Profile): string {
    return profile.city ? String(profile.city.id) : '';
}

function mergeCities(cities: City[], current: City | null): City[] {
    if (!current || cities.some(({ id }) => id === current.id)) return cities;
    return [current, ...cities];
}

export interface ProfileEditPageProps {
    profile: Profile;
    onLogout: () => Promise<void>;
}

export interface ProfileEditPageState {
    profile: Profile;
    values: FormValues;
    errors: FormValues;
    cityId: string;
    cities: City[];
    listingsCount: number | null;
    saving: boolean;
    avatarUploading: boolean;
    avatarError: string;
    toast: { id: number; type: ToastType; message: string } | null;
}

export class ProfileEditPage extends Component<ProfileEditPageProps, ProfileEditPageState> {
    validation: FormValidation;

    fileInput: HTMLInputElement | null = null;

    toastTimer: ReturnType<typeof setTimeout> | null = null;

    toastId = 0;

    constructor(props: ProfileEditPageProps) {
        super(props);

        this.validation = new FormValidation(RULES, () => this.syncValidation());
        this.validation.values = profileValues(props.profile);
        this.state = {
            profile: props.profile,
            values: { ...this.validation.values },
            errors: {},
            cityId: profileCityId(props.profile),
            cities: mergeCities([], props.profile.city),
            listingsCount: null,
            saving: false,
            avatarUploading: false,
            avatarError: '',
            toast: null,
        };
    }

    componentDidMount() {
        void this.loadCities();
        void this.loadListingsCount();
    }

    componentWillUnmount() {
        this.validation.destroy();
        if (this.toastTimer) clearTimeout(this.toastTimer);
    }

    async loadCities() {
        try {
            const cities = await getCities();
            this.setState(({ profile }) => ({ cities: mergeCities(cities, profile.city) }));
        } catch (err) {
            logWarn('Не удалось загрузить города:', err);
        }
    }

    async loadListingsCount() {
        try {
            const page = await getMyListings({ limit: 1 });
            this.setState({ listingsCount: page.counts?.all ?? page.total ?? null });
        } catch (err) {
            logWarn('Не удалось загрузить число объявлений:', err);
        }
    }

    syncValidation() {
        this.setState({
            values: { ...this.validation.values },
            errors: { ...this.validation.errors },
        });
    }

    fillForm(profile: Profile) {
        this.validation.validateTouchedDebounced.cancel();
        this.validation.values = profileValues(profile);
        this.validation.errors = {};
        this.validation.touched.clear();
        this.validation.submitted = false;
        this.setState({
            profile,
            values: { ...this.validation.values },
            errors: {},
            cityId: profileCityId(profile),
        });
    }

    showToast(type: ToastType, message: string) {
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastId += 1;
        this.setState({ toast: { id: this.toastId, type, message } });
        this.toastTimer = setTimeout(() => {
            this.toastTimer = null;
            this.setState({ toast: null });
        }, TOAST_DURATION_MS);
    }

    applyProfile(profile: Profile) {
        setUser(profile);
        this.setState(({ cities }) => ({ profile, cities: mergeCities(cities, profile.city) }));
    }

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;
        this.validation.input(input.name, input.value);
    };

    handleChange = (e: Event) => {
        this.validation.change((e.target as HTMLInputElement | HTMLTextAreaElement).name);
    };

    handleCityChange = (e: Event) => {
        const cityId = (e.target as HTMLSelectElement).value;
        this.validation.errors.city_id = '';
        this.setState(({ errors }) => ({ cityId, errors: { ...errors, city_id: '' } }));
    };

    handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        if (this.state.saving) return;

        const values = this.validation.validateAll();
        if (!values) return;

        const { cityId } = this.state;
        this.setState({ saving: true });
        try {
            const profile = await updateProfile({
                first_name: values.first_name.trim().replace(/ {2,}/g, ' '),
                phone: values.phone,
                email: values.email.trim(),
                about: values.about.trim(),
                ...(cityId ? { city_id: Number(cityId) } : {}),
            });
            this.applyProfile(profile);
            this.fillForm(profile);
            this.showToast('success', 'Изменения сохранены');
        } catch (err) {
            logError('Не удалось сохранить профиль:', err);
            const { field, message } = describeApiError(err, {
                fields: API_FIELDS,
                fallback: 'Не удалось сохранить изменения. Попробуйте ещё раз',
                conflictMessages: {
                    email: 'Этот email уже занят другим пользователем',
                    phone: 'Этот номер уже привязан к другому аккаунту',
                },
                byStatus: { 409: 'Email или телефон уже заняты другим пользователем' },
            });
            if (field) this.validation.setError(field, message);
            else this.showToast('error', message);
        } finally {
            this.setState({ saving: false });
        }
    };

    handleCancel = () => {
        this.fillForm(this.state.profile);
    };

    openFilePicker = () => {
        this.fileInput?.click();
    };

    handleAvatarChange = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;

        if (!AVATAR_TYPES.includes(file.type)) {
            this.setState({ avatarError: AVATAR_TYPE_ERROR });
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            this.setState({ avatarError: AVATAR_SIZE_ERROR });
            return;
        }

        this.setState({ avatarUploading: true, avatarError: '' });
        try {
            const { avatar_url } = await uploadAvatar(file);
            this.applyProfile({ ...this.state.profile, avatar_url });
            this.showToast('success', 'Фото обновлено');
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
            this.setState({ avatarError: message });
        } finally {
            this.setState({ avatarUploading: false });
        }
    };

    fieldProps(name: string) {
        return {
            name,
            large: true,
            value: this.state.values[name],
            error: this.state.errors[name],
            onInput: this.handleInput,
            onChange: this.handleChange,
        };
    }

    renderAvatar() {
        const { profile, avatarUploading, avatarError } = this.state;

        return (
            <div class="profile-edit__avatar-row">
                <UserAvatar user={profile} class="profile-edit__avatar" />
                <div class="profile-edit__avatar-actions">
                    <button
                        type="button"
                        class="profile-edit__avatar-button"
                        disabled={avatarUploading}
                        onClick={this.openFilePicker}
                    >
                        <CameraIcon />
                        {avatarUploading ? 'Загружаем фото…' : 'Изменить фото'}
                    </button>
                    <input
                        ref={(el) => { this.fileInput = el as HTMLInputElement | null; }}
                        class="profile-edit__file"
                        type="file"
                        accept={AVATAR_TYPES.join(',')}
                        tabindex="-1"
                        aria-hidden="true"
                        onChange={this.handleAvatarChange}
                    />
                    {avatarError
                        ? <span class="profile-edit__avatar-hint profile-edit__avatar-hint--error" role="alert">{avatarError}</span>
                        : <span class="profile-edit__avatar-hint">JPG или PNG, до 5 МБ</span>}
                </div>
            </div>
        );
    }

    renderCity() {
        const { cities, cityId, errors } = this.state;
        const error = errors.city_id ?? '';

        return (
            <div class={error ? 'profile-edit__field profile-edit__field--error' : 'profile-edit__field'}>
                <label class="profile-edit__label" for="profile-city">Город</label>
                <select
                    id="profile-city"
                    class="profile-edit__select"
                    name="city_id"
                    aria-invalid={String(Boolean(error))}
                    onChange={this.handleCityChange}
                >
                    {!cityId && <option key="none" value="" selected disabled>Выберите город</option>}
                    {cities.map(({ id, name }) => (
                        <option key={id} value={String(id)} selected={String(id) === cityId}>{name}</option>
                    ))}
                </select>
                {error && <p class="profile-edit__error">{error}</p>}
            </div>
        );
    }

    renderAbout() {
        const { values, errors } = this.state;
        const error = errors.about ?? '';
        const about = values.about ?? '';

        return (
            <div class={error ? 'profile-edit__field profile-edit__field--error' : 'profile-edit__field'}>
                <label class="profile-edit__label" for="profile-about">О себе</label>
                <div class="profile-edit__textarea-box">
                    <textarea
                        id="profile-about"
                        class="profile-edit__textarea"
                        name="about"
                        maxlength={LIMITS.aboutMax}
                        placeholder="Расскажите покупателям о себе"
                        value={about}
                        aria-invalid={String(Boolean(error))}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    />
                    <span class="profile-edit__counter">{about.length} / {LIMITS.aboutMax}</span>
                </div>
                {error && <p class="profile-edit__error">{error}</p>}
            </div>
        );
    }

    renderSection(title: string, caption: string, action: string) {
        return (
            <section class="profile-edit__section">
                <div class="profile-edit__section-text">
                    <h2 class="profile-edit__section-title">{title}</h2>
                    <p class="profile-edit__section-caption">{caption}</p>
                </div>
                <button type="button" class="profile-edit__section-action" disabled>{action}</button>
            </section>
        );
    }

    render() {
        const { onLogout } = this.props;
        const { profile, listingsCount, saving, toast } = this.state;

        return (
            <ProfileLayout profile={profile} active="settings" listingsCount={listingsCount} onLogout={onLogout}>
                <form class="profile-edit" novalidate onSubmit={this.handleSubmit}>
                    <h1 class="profile-edit__title">Редактирование профиля</h1>

                    <section class="profile-edit__card">
                        <h2 class="profile-edit__card-title">Личные данные</h2>
                        {this.renderAvatar()}
                        <div class="profile-edit__fields">
                            <FormField
                                {...this.fieldProps('first_name')}
                                id="profile-first-name"
                                label="Имя или никнейм"
                                placeholder="Например, Иван"
                                autocomplete="given-name"
                                hint="Его увидят покупатели и продавцы"
                            />
                            <FormField
                                {...this.fieldProps('phone')}
                                id="profile-phone"
                                label="Телефон"
                                type="tel"
                                placeholder="+7 900 000-00-00"
                                autocomplete="tel"
                                inputmode="tel"
                                hint="Покупатели смогут вам позвонить"
                            />
                            <FormField
                                {...this.fieldProps('email')}
                                id="profile-email"
                                label="Email"
                                type="email"
                                placeholder="name@mail.ru"
                                autocomplete="email"
                                hint="Для входа в аккаунт и уведомлений"
                            />
                            {this.renderCity()}
                        </div>
                        {this.renderAbout()}
                    </section>

                    {this.renderSection('Пароль', 'Используется для входа по email или телефону', 'Сменить пароль')}
                    {this.renderSection('Адреса доставки', 'Сохраняются при оформлении заказа', 'Изменить адреса')}

                    <div class="profile-edit__actions">
                        <button type="submit" class="profile-edit__save" disabled={saving}>
                            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
                        </button>
                        <button type="button" class="profile-edit__cancel" disabled={saving} onClick={this.handleCancel}>
                            Отмена
                        </button>
                    </div>
                </form>
                {toast && <Toast key={toast.id} type={toast.type} message={toast.message} />}
            </ProfileLayout>
        );
    }
}
