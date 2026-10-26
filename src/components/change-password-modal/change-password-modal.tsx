import { Component } from '@/vdom';
import { Modal } from '@/components/modal/modal';
import { FormField } from '@/components/form-field/form-field';
import { PasswordRules, getPasswordRuleStates } from '@/components/password-rules/password-rules';
import { changePassword, requestPasswordReset } from '@/lib/api';
import { FormValidation, describeApiError, type FormValues } from '@/lib/form';
import { validatePassword, validatePasswordRepeat } from '@/lib/validators';
import { logWarn } from '@/lib/logger';
import './change-password-modal.scss';

export interface ChangePasswordModalProps {
    email: string;
    onChanged: () => void;
    onClose: () => void;
}

type Step = 'change' | 'forgot' | 'sent';

export interface ChangePasswordModalState {
    step: Step;
    values: FormValues;
    errors: FormValues;
    formError: string;
    pending: boolean;
}

export class ChangePasswordModal extends Component<ChangePasswordModalProps, ChangePasswordModalState> {
    validation: FormValidation;

    constructor(props: ChangePasswordModalProps) {
        super(props);

        this.validation = new FormValidation({
            current_password: { validate: () => '', required: 'Введите текущий пароль' },
            new_password: { validate: validatePassword, required: 'Введите новый пароль' },
            password_repeat: {
                required: 'Повторите новый пароль',
                validate: (value, values) => validatePasswordRepeat(value, values.new_password ?? ''),
            },
        }, () => this.syncValidation());

        this.state = {
            step: 'change',
            values: { ...this.validation.values },
            errors: {},
            formError: '',
            pending: false,
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
        if (this.state.pending) return;
        this.setState({ formError: '' });

        const values = this.validation.validateAll();
        if (!values) return;

        this.setState({ pending: true });
        try {
            await changePassword({ current_password: values.current_password, new_password: values.new_password });
            this.props.onChanged();
        } catch (err) {
            logWarn('Не удалось сменить пароль:', err);
            const { field, message } = describeApiError(err, {
                fields: ['current_password', 'new_password'],
                fallback: 'Не удалось сменить пароль. Попробуйте ещё раз',
            });
            if (field === 'current_password') this.validation.setError(field, 'Неверный текущий пароль');
            else if (field) this.validation.setError(field, 'Пароль не соответствует требованиям');
            else this.setState({ formError: message });
            this.setState({ pending: false });
        }
    };

    handleSendLink = async () => {
        this.setState({ pending: true, formError: '' });
        try {
            await requestPasswordReset(this.props.email);
            this.setState({ step: 'sent', pending: false });
        } catch (err) {
            logWarn('Не удалось отправить ссылку для сброса пароля:', err);
            const { message } = describeApiError(err, {
                fields: [],
                fallback: 'Не удалось отправить ссылку. Попробуйте ещё раз',
            });
            this.setState({ formError: message, pending: false });
        }
    };

    showStep(step: Step) {
        this.setState({ step, formError: '' });
    }

    renderError() {
        const { formError } = this.state;
        return formError && <p class="change-password-modal__error" role="alert">{formError}</p>;
    }

    renderChange() {
        const { values, errors, pending } = this.state;
        const mismatch = Boolean(errors.password_repeat) && Boolean(values.password_repeat);

        return (
            <Modal
                title="Смена пароля"
                onClose={this.props.onClose}
                actions={(
                    <>
                        <button
                            type="submit"
                            form="change-password-form"
                            class="change-password-modal__confirm"
                            disabled={pending}
                        >{pending ? 'Сохраняем…' : 'Сменить пароль'}</button>
                        <button type="button" class="change-password-modal__cancel" disabled={pending} onClick={this.props.onClose}>
                            Отмена
                        </button>
                    </>
                )}
            >
                <form id="change-password-form" class="change-password-modal__form" novalidate onSubmit={this.handleSubmit}>
                    <div class="change-password-modal__current">
                        <FormField
                            id="change-password-current"
                            name="current_password"
                            label="Текущий пароль"
                            autocomplete="current-password"
                            password
                            value={values.current_password}
                            error={errors.current_password}
                            onInput={this.handleInput}
                            onChange={this.handleChange}
                        />
                        <button type="button" class="change-password-modal__forgot" onClick={() => this.showStep('forgot')}>
                            Забыли текущий пароль?
                        </button>
                    </div>
                    <FormField
                        id="change-password-new"
                        name="new_password"
                        label="Новый пароль"
                        autocomplete="new-password"
                        password
                        value={values.new_password}
                        error={errors.new_password}
                        invalid={mismatch}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    >
                        <PasswordRules states={getPasswordRuleStates(values.new_password ?? '')} />
                    </FormField>
                    <FormField
                        id="change-password-repeat"
                        name="password_repeat"
                        label="Повторите новый пароль"
                        autocomplete="new-password"
                        password
                        value={values.password_repeat}
                        error={errors.password_repeat}
                        onInput={this.handleInput}
                        onChange={this.handleChange}
                    />
                    {this.renderError()}
                </form>
            </Modal>
        );
    }

    renderForgot() {
        const { pending } = this.state;

        return (
            <Modal
                title="Восстановление пароля"
                description={`Отправим ссылку для сброса пароля на ${this.props.email}. Ссылка действует 30 минут.`}
                onClose={this.props.onClose}
                actions={(
                    <>
                        <button type="button" class="change-password-modal__confirm" disabled={pending} onClick={this.handleSendLink}>
                            {pending ? 'Отправляем…' : 'Отправить ссылку'}
                        </button>
                        <button type="button" class="change-password-modal__cancel" disabled={pending} onClick={() => this.showStep('change')}>
                            Назад
                        </button>
                    </>
                )}
            >
                {this.renderError()}
            </Modal>
        );
    }

    renderSent() {
        return (
            <Modal
                title="Проверьте почту"
                description={`Отправили ссылку для сброса пароля на ${this.props.email}. Не пришло — проверьте папку «Спам».`}
                onClose={this.props.onClose}
                actions={<button type="button" class="change-password-modal__confirm" onClick={this.props.onClose}>Понятно</button>}
            />
        );
    }

    render() {
        switch (this.state.step) {
            case 'forgot': return this.renderForgot();
            case 'sent': return this.renderSent();
            default: return this.renderChange();
        }
    }
}
