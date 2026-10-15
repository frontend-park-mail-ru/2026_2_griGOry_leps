import { Component, type Child } from '@/vdom';
import './form-field.scss';

/** Перечёркнута, пока пароль скрыт (.form-field__toggle-slash) */
const EyeIcon = () => (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" />
        <circle cx="10" cy="10" r="2.5" />
        <path class="form-field__toggle-slash" d="M3 3L17 17" />
    </svg>
);

export interface FormFieldProps {
    id: string;
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    autocomplete?: string;
    inputmode?: string;
    password?: boolean;
    value?: string;
    hint?: string;
    error?: string;
    /** Красная рамка без текста, когда ошибка показана у соседнего поля */
    invalid?: boolean;
    onInput?: (event: Event) => void;
    /** Нативный change: срабатывает, когда ушли из поля */
    onChange?: (event: Event) => void;
    children?: Child;
}

export class FormField extends Component<FormFieldProps, { passwordVisible: boolean }> {
    state = { passwordVisible: false };

    togglePassword = () => {
        this.setState({ passwordVisible: !this.state.passwordVisible });
    };

    render() {
        const {
            id, name, label, type = 'text', placeholder, autocomplete, inputmode,
            password = false, value = '', hint, error = '', invalid = false,
            onInput, onChange, children,
        } = this.props;
        const visible = this.state.passwordVisible;

        const classes = ['form-field'];
        if (error) classes.push('form-field--error');
        if (invalid) classes.push('form-field--invalid');

        let inputType = type;
        if (password) inputType = visible ? 'text' : 'password';

        return (
            <div class={classes.join(' ')}>
                <label class="form-field__label" for={id}>{label}</label>

                <div class="form-field__control">
                    <input
                        class="form-field__input"
                        id={id}
                        name={name}
                        type={inputType}
                        placeholder={placeholder}
                        autocomplete={autocomplete}
                        inputmode={inputmode}
                        value={value}
                        aria-invalid={String(Boolean(error) || invalid)}
                        onInput={onInput}
                        onChange={onChange}
                    />

                    {password && (
                        <button
                            class="form-field__toggle"
                            type="button"
                            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
                            aria-pressed={String(visible)}
                            onClick={this.togglePassword}
                        >
                            <EyeIcon />
                        </button>
                    )}
                </div>

                {children}
                {hint && <p class="form-field__hint">{hint}</p>}
                <p class="form-field__error" data-error-for={name}>{error || null}</p>
            </div>
        );
    }
}
