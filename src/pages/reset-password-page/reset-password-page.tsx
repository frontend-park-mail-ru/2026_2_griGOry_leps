import { Component } from '@/vdom';
import './reset-password-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header';
import { AuthCard } from '@/components/auth-card/auth-card';
import { AuthForm } from '@/components/auth-form/auth-form';
import { Button } from '@/components/button/button';
import { FormField } from '@/components/form-field/form-field';
import { PasswordRules, getPasswordRuleStates } from '@/components/password-rules/password-rules';

import { ApiError, checkResetToken, resetPassword } from '@/lib/api';
import { FormValidation, describeApiError, type FormValues } from '@/lib/form';
import { validatePassword, validatePasswordRepeat } from '@/lib/validators';
import { navigate } from '@/router/router';
import { clearUser } from '@/store';

export interface ResetPasswordProps {
    token: string;
    email: string | null;
}

export async function loadResetPassword(): Promise<ResetPasswordProps> {
    const token = new URLSearchParams(location.search).get('token') ?? '';
    if (!token) return { token, email: null };

    try {
        return { token, email: await checkResetToken(token) };
    } catch (err) {
        if (err instanceof ApiError && err.status === 400) return { token, email: null };
        throw err;
    }
}

export interface ResetPasswordState {
    values: FormValues;
    errors: FormValues;
    formError: string;
    submitting: boolean;
    expired: boolean;
    done: boolean;
}

export class ResetPasswordPage extends Component<ResetPasswordProps, ResetPasswordState> {
    validation: FormValidation;

    constructor(props: ResetPasswordProps) {
        super(props);

        this.validation = new FormValidation({
            password: { validate: validatePassword, required: 'Введите пароль' },
            passwordRepeat: {
                required: 'Повторите пароль',
                validate: (value, values) => validatePasswordRepeat(value, values.password ?? ''),
            },
        }, () => this.syncValidation());

        this.state = {
            values: { ...this.validation.values },
            errors: {},
            formError: '',
            submitting: false,
            expired: props.email === null,
            done: false,
        };
    }

    componentWillUnmount() {
        this.validation.destroy();
    }

    syncValidation() {
        this.setState({
            values: { ...this.validation.values },
            errors: { ...this.validation.errors },
        });
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
        this.setState({ formError: '' });

        const values = this.validation.validateAll();
        if (!values) return;

        this.setState({ submitting: true });
        try {
            await resetPassword(this.props.token, values.password);
            clearUser();
            this.setState({ done: true });
        } catch (err) {
            if (err instanceof ApiError && err.field === 'token') {
                this.setState({ expired: true });
                return;
            }

            const { field, message } = describeApiError(err, {
                fields: ['password'],
                fallback: 'Не удалось сохранить пароль. Попробуйте ещё раз',
            });
            if (field) this.validation.setError(field, 'Пароль не соответствует требованиям');
            else this.setState({ formError: message });
        } finally {
            this.setState({ submitting: false });
        }
    };

    renderExpired() {
        return (
            <AuthCard
                icon="expired"
                title="Ссылка больше не действует"
                subtitle="Ссылка для сброса пароля действует 30 минут и только один раз. Запросите новую — это займёт минуту."
            >
                <div class="reset-password-page__actions">
                    <Button text="Запросить новую ссылку" block onClick={() => navigate('/forgot-password')} />
                    <a href="/login" data-link class="reset-password-page__link">Вернуться ко входу</a>
                </div>
            </AuthCard>
        );
    }

    renderDone() {
        return (
            <AuthCard
                icon="success"
                title="Пароль обновлён"
                subtitle="Теперь войдите с новым паролем. На других устройствах мы вышли из аккаунта."
            >
                <Button text="Войти" block onClick={() => navigate('/login')} />
            </AuthCard>
        );
    }

    renderForm() {
        const { values, errors, formError, submitting } = this.state;
        const passwordMismatch = Boolean(errors.passwordRepeat) && Boolean(values.passwordRepeat);

        return (
            <AuthCard title="Новый пароль" subtitle={`Придумайте новый пароль для ${this.props.email}`}>
                <AuthForm
                    id="reset-password-form"
                    error={formError}
                    onSubmit={this.handleSubmit}
                    footer={<Button type="submit" text="Сохранить пароль" block disabled={submitting} />}
                >
                    <FormField
                        id="reset-password-input"
                        name="password"
                        label="Пароль"
                        placeholder="Придумайте пароль"
                        autocomplete="new-password"
                        password
                        value={values.password}
                        error={errors.password}
                        invalid={passwordMismatch}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    >
                        <PasswordRules states={getPasswordRuleStates(values.password)} />
                    </FormField>
                    <FormField
                        id="reset-password-repeat-input"
                        name="passwordRepeat"
                        label="Повторите пароль"
                        placeholder="Ещё раз пароль"
                        autocomplete="new-password"
                        password
                        value={values.passwordRepeat}
                        error={errors.passwordRepeat}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    />
                </AuthForm>
            </AuthCard>
        );
    }

    render() {
        const { expired, done } = this.state;

        let card = this.renderForm();
        if (done) card = this.renderDone();
        else if (expired) card = this.renderExpired();

        return (
            <div class="reset-password-page">
                <AuthHeader />
                <div class="reset-password-page__content">{card}</div>
            </div>
        );
    }
}
