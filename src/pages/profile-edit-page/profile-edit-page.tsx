import { Component } from '@/vdom';
import {
    cancelEmailChange,
    getAddresses,
    getCities,
    getMe,
    resendVerification,
    updateProfile,
    type Address,
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
import { formatAddress } from '@/lib/format';
import { logError, logWarn } from '@/lib/logger';
import { setUser } from '@/store';
import { ProfileLayout } from '@/components/profile-layout/profile-layout';
import { FormField } from '@/components/form-field/form-field';
import { AvatarUploader } from '@/components/avatar-uploader/avatar-uploader';
import { TextareaField } from '@/components/textarea-field/textarea-field';
import { Select } from '@/components/select/select';
import { Toast } from '@/components/toast/toast';
import { ToastTimer, type ToastState } from '@/lib/toast';
import { ChangePasswordModal } from '@/components/change-password-modal/change-password-modal';
import { AlertBanner } from '@/components/alert-banner/alert-banner';
import './profile-edit-page.scss';

const RULES: Record<string, FieldRule> = {
    first_name: { validate: validateName, required: 'Введите имя' },
    phone: { validate: validatePhone, sanitize: sanitizePhone, required: 'Введите телефон' },
    email: { validate: validateEmail, required: 'Введите email' },
    about: { validate: validateAbout },
};

const API_FIELDS = [...Object.keys(RULES), 'city_id'];

function profileValues(profile: Profile): FormValues {
    return {
        first_name: profile.first_name ?? '',
        phone: profile.phone ?? '',
        email: profile.pending_email ?? profile.email ?? '',
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
    addresses: Address[] | null;
    addressesError: boolean;
    saving: boolean;
    passwordModal: boolean;
    emailConfirmed: boolean;
    emailBusy: boolean;
    toast: ToastState | null;
}

export class ProfileEditPage extends Component<ProfileEditPageProps, ProfileEditPageState> {
    validation: FormValidation;

    toasts = new ToastTimer((toast) => this.setState({ toast }));

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
            addresses: null,
            addressesError: false,
            saving: false,
            passwordModal: false,
            emailConfirmed: new URLSearchParams(location.search).get('email') === 'confirmed',
            emailBusy: false,
            toast: null,
        };
    }

    componentDidMount() {
        void this.loadCities();
        void this.loadAddresses();
    }

    componentWillUnmount() {
        this.validation.destroy();
        this.toasts.stop();
    }

    async loadCities() {
        try {
            const cities = await getCities();
            this.setState(({ profile }) => ({ cities: mergeCities(cities, profile.city) }));
        } catch (err) {
            logWarn('Не удалось загрузить города:', err);
        }
    }

    async loadAddresses() {
        try {
            this.setState({ addresses: await getAddresses(), addressesError: false });
        } catch (err) {
            logWarn('Не удалось загрузить адреса:', err);
            this.setState({ addressesError: true });
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

    handleCityChange = (cityId: string) => {
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
            this.toasts.show('success', 'Изменения сохранены');
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
            else this.toasts.show('error', message);
        } finally {
            this.setState({ saving: false });
        }
    };

    handleCancel = () => {
        this.fillForm(this.state.profile);
    };

    handleResendVerification = async () => {
        this.setState({ emailBusy: true });
        try {
            const email = await resendVerification();
            this.toasts.show('success', `Отправили письмо на ${email}`);
        } catch (err) {
            logWarn('Не удалось отправить письмо для подтверждения:', err);
            const { message } = describeApiError(err, {
                fields: [],
                fallback: 'Не удалось отправить письмо. Попробуйте ещё раз',
            });
            this.toasts.show('error', message);
        } finally {
            this.setState({ emailBusy: false });
        }
    };

    handleCancelEmailChange = async () => {
        this.setState({ emailBusy: true });
        try {
            await cancelEmailChange();
            const profile = await getMe();
            if (profile) {
                this.applyProfile(profile);
                this.fillForm(profile);
            }
            this.toasts.show('success', 'Смена почты отменена');
        } catch (err) {
            logWarn('Не удалось отменить смену почты:', err);
            this.toasts.show('error', 'Не удалось отменить смену почты. Попробуйте ещё раз');
        } finally {
            this.setState({ emailBusy: false });
        }
    };

    emailHint(): string | undefined {
        const { profile, emailConfirmed } = this.state;
        if (profile.pending_email || !profile.email_verified || emailConfirmed) return undefined;
        return 'Для входа в аккаунт и уведомлений';
    }

    renderEmailNotice() {
        const { profile, emailConfirmed, emailBusy } = this.state;
        const resend = (
            <button type="button" class="profile-edit__email-action" disabled={emailBusy} onClick={this.handleResendVerification}>
                Отправить письмо ещё раз
            </button>
        );

        if (profile.pending_email) {
            return (
                <div class="profile-edit__email-notice">
                    <AlertBanner>
                        {`Подтвердите новую почту: отправили письмо на ${profile.pending_email}, ссылка действует 30 минут. `
                            + `Пока почта не подтверждена, уведомления приходят на ${profile.email}`}
                    </AlertBanner>
                    <p class="profile-edit__email-actions">
                        {resend}
                        <span class="profile-edit__email-dot" aria-hidden="true">·</span>
                        <button type="button" class="profile-edit__email-action" disabled={emailBusy} onClick={this.handleCancelEmailChange}>
                            Отменить смену почты
                        </button>
                    </p>
                </div>
            );
        }
        if (!profile.email_verified) {
            return (
                <div class="profile-edit__email-notice">
                    <AlertBanner>{`Подтвердите почту: отправили письмо на ${profile.email}, ссылка действует 30 минут.`}</AlertBanner>
                    <p class="profile-edit__email-actions">{resend}</p>
                </div>
            );
        }
        if (emailConfirmed) {
            return <p class="profile-edit__email-confirmed">Почта подтверждена. Уведомления о заказах теперь приходят сюда</p>;
        }
        return null;
    }

    handlePasswordChanged = () => {
        this.setState({ passwordModal: false });
        this.toasts.show('success', 'Пароль изменён. На других устройствах мы вышли из аккаунта');
    };

    handleAvatarUploaded = (avatarUrl: string | null) => {
        this.applyProfile({ ...this.state.profile, avatar_url: avatarUrl });
        this.toasts.show('success', 'Фото обновлено');
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

    renderCity() {
        const { cities, cityId, errors } = this.state;
        const error = errors.city_id ?? '';

        return (
            <div class={error ? 'profile-edit__field profile-edit__field--error' : 'profile-edit__field'}>
                <label class="profile-edit__label" for="profile-city">Город</label>
                <Select
                    id="profile-city"
                    options={cities.map(({ id, name }) => ({ value: String(id), label: name }))}
                    value={cityId}
                    placeholder="Выберите город"
                    invalid={Boolean(error)}
                    onChange={this.handleCityChange}
                />
                {error && <p class="profile-edit__error">{error}</p>}
            </div>
        );
    }

    renderAbout() {
        const { values, errors } = this.state;

        return (
            <TextareaField
                id="profile-about"
                name="about"
                label="О себе"
                placeholder="Расскажите покупателям о себе"
                value={values.about ?? ''}
                maxLength={LIMITS.aboutMax}
                height={140}
                error={errors.about}
                onInput={this.handleInput}
                onChange={this.handleChange}
            />
        );
    }

    renderPassword() {
        return (
            <section class="profile-edit__section">
                <div class="profile-edit__section-text">
                    <h2 class="profile-edit__section-title">Пароль</h2>
                    <p class="profile-edit__section-caption">Используется для входа по email или телефону</p>
                </div>
                <button type="button" class="profile-edit__section-action" onClick={() => this.setState({ passwordModal: true })}>
                    Сменить пароль
                </button>
            </section>
        );
    }

    addressesCaption(): string {
        const { addresses, addressesError } = this.state;
        if (addressesError) return 'Не удалось загрузить адреса';
        if (!addresses) return 'Загружаем адреса…';
        if (addresses.length === 0) return 'Пока нет сохранённых адресов';

        const main = addresses.find(({ is_default }) => is_default) ?? addresses[0];
        const rest = addresses.length - 1;
        const suffix = rest > 0 ? ` и ещё ${rest}` : '';
        return `${formatAddress(main)}${main.is_default ? ' (основной)' : ''}${suffix}`;
    }

    renderAddresses() {
        const { addresses } = this.state;

        return (
            <section class="profile-edit__section">
                <div class="profile-edit__section-text">
                    <h2 class="profile-edit__section-title">Адреса доставки</h2>
                    <p class="profile-edit__section-caption">{this.addressesCaption()}</p>
                </div>
                <a href="/profile/addresses" data-link class="profile-edit__section-action">
                    {addresses?.length === 0 ? 'Добавить адрес' : 'Изменить адреса'}
                </a>
            </section>
        );
    }

    render() {
        const { onLogout } = this.props;
        const { profile, saving, passwordModal, toast } = this.state;

        return (
            <ProfileLayout profile={profile} active="settings" onLogout={onLogout}>
                <form class="profile-edit" novalidate onSubmit={this.handleSubmit}>
                    <h1 class="profile-edit__title">Редактирование профиля</h1>

                    <section class="profile-edit__card">
                        <h2 class="profile-edit__card-title">Личные данные</h2>
                        <AvatarUploader user={profile} onUploaded={this.handleAvatarUploaded} />
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
                                hint={this.emailHint()}
                            >
                                {this.renderEmailNotice()}
                            </FormField>
                            {this.renderCity()}
                        </div>
                        {this.renderAbout()}
                    </section>

                    {this.renderPassword()}
                    {this.renderAddresses()}

                    <div class="profile-edit__actions">
                        <button type="submit" class="profile-edit__save" disabled={saving}>
                            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
                        </button>
                        <button type="button" class="profile-edit__cancel" disabled={saving} onClick={this.handleCancel}>
                            Отмена
                        </button>
                    </div>
                </form>
                {passwordModal && (
                    <ChangePasswordModal
                        email={profile.email}
                        onChanged={this.handlePasswordChanged}
                        onClose={() => this.setState({ passwordModal: false })}
                    />
                )}
                {toast && <Toast key={toast.id} type={toast.type} message={toast.message} />}
            </ProfileLayout>
        );
    }
}
