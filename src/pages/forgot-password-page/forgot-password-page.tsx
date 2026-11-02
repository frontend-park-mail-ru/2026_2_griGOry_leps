import { Component } from '@/vdom';
import './forgot-password-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header';
import { AuthCard } from '@/components/auth-card/auth-card';
import { AuthForm } from '@/components/auth-form/auth-form';
import { Button } from '@/components/button/button';
import { FormField } from '@/components/form-field/form-field';

import { requestPasswordReset } from '@/lib/api';
import { formatCountdown } from '@/lib/format';
import { FormValidation, describeApiError, type FormValues } from '@/lib/form';
import { normalizeLogin, validateLogin } from '@/lib/validators';
import { navigate } from '@/router/router';

const RESEND_DELAY_S = 60;
const LOGIN_ERROR = 'Введите email в формате name@example.ru или номер телефона';

export interface ForgotPasswordState {
    values: FormValues;
    errors: FormValues;
    formError: string;
    submitting: boolean;
    sentTo: string;
    secondsLeft: number;
}

export class ForgotPasswordPage extends Component<object, ForgotPasswordState> {
    validation: FormValidation;
    timer: ReturnType<typeof setInterval> | null = null;

    constructor(props: object) {
        super(props);

        this.validation = new FormValidation({
            login: {
                validate: (value) => (validateLogin(value) ? LOGIN_ERROR : ''),
                normalize: normalizeLogin,
                required: 'Введите телефон или email',
            },
        }, () => this.syncValidation());

        this.state = {
            values: { ...this.validation.values },
            errors: {},
            formError: '',
            submitting: false,
            sentTo: '',
            secondsLeft: 0,
        };
    }

    componentWillUnmount() {
        this.validation.destroy();
        this.stopTimer();
    }

    syncValidation() {
        this.setState({
            values: { ...this.validation.values },
            errors: { ...this.validation.errors },
        });
    }

    startTimer() {
        this.stopTimer();
        this.setState({ secondsLeft: RESEND_DELAY_S });
        this.timer = setInterval(() => {
            const secondsLeft = this.state.secondsLeft - 1;
            this.setState({ secondsLeft });
            if (secondsLeft <= 0) this.stopTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
    }

    async send(login: string): Promise<boolean> {
        this.setState({ submitting: true, formError: '' });
        try {
            await requestPasswordReset(login);
            this.startTimer();
            return true;
        } catch (err) {
            const { field, message } = describeApiError(err, {
                fields: ['login'],
                fallback: 'Не удалось отправить ссылку. Попробуйте ещё раз',
            });
            if (field) this.validation.setError(field, LOGIN_ERROR);
            else this.setState({ formError: message });
            return false;
        } finally {
            this.setState({ submitting: false });
        }
    }

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement;
        this.validation.input(input.name, input.value);
    };

    handleChange = (e: Event) => {
        this.validation.change((e.target as HTMLInputElement).name);
    };

    handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        const values = this.validation.validateAll();
        if (!values) return;

        const login = values.login.trim();
        if (await this.send(login)) this.setState({ sentTo: login });
    };

    handleResend = () => {
        void this.send(this.state.sentTo);
    };

    renderSent() {
        const { sentTo, secondsLeft, submitting, formError } = this.state;
        const where = sentTo.includes('@') ? `на ${sentTo}` : 'на почту, привязанную к аккаунту';

        return (
            <AuthCard
                icon="mail"
                title="Проверьте почту"
                subtitle={`Отправили ссылку для сброса пароля ${where}. Ссылка действует 30 минут. Не пришло — проверьте папку «Спам».`}
            >
                <div class="forgot-password-page__actions">
                    <Button text="Вернуться ко входу" block onClick={() => navigate('/login')} />
                    {formError && <p class="forgot-password-page__error" role="alert">{formError}</p>}
                    {secondsLeft > 0
                        ? <p class="forgot-password-page__resend">Отправить ещё раз через {formatCountdown(secondsLeft)}</p>
                        : (
                            <button
                                type="button"
                                class="forgot-password-page__resend forgot-password-page__resend--active"
                                disabled={submitting}
                                onClick={this.handleResend}
                            >Отправить ещё раз</button>
                        )}
                </div>
            </AuthCard>
        );
    }

    renderForm() {
        const { values, errors, formError, submitting } = this.state;

        return (
            <AuthCard
                title="Восстановление пароля"
                subtitle="Укажите email или телефон, который вы использовали при регистрации. Отправим ссылку для сброса пароля"
            >
                <AuthForm
                    id="forgot-password-form"
                    error={formError}
                    onSubmit={this.handleSubmit}
                    footer={[
                        <Button type="submit" text="Отправить ссылку" block disabled={submitting || Boolean(errors.login)} />,
                        <a href="/login" data-link class="forgot-password-page__back">Вернуться ко входу</a>,
                    ]}
                >
                    <FormField
                        id="forgot-login-input"
                        name="login"
                        label="Телефон или email"
                        placeholder="+7 900 000-00-00 или name@mail.ru"
                        autocomplete="username"
                        value={values.login}
                        error={errors.login}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    />
                </AuthForm>
            </AuthCard>
        );
    }

    render() {
        return (
            <div class="forgot-password-page">
                <AuthHeader />
                <div class="forgot-password-page__content">
                    {this.state.sentTo ? this.renderSent() : this.renderForm()}
                </div>
            </div>
        );
    }
}
