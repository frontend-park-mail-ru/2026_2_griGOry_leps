import './textarea-field.scss';

export interface TextareaFieldProps {
    id: string;
    name: string;
    label?: string;
    ariaLabel?: string;
    value: string;
    maxLength: number;
    height: number;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    onInput?: (event: Event) => void;
    onChange?: (event: Event) => void;
}

export const TextareaField = ({
    id, name, label, ariaLabel, value, maxLength, height, placeholder, error = '', disabled, onInput, onChange,
}: TextareaFieldProps) => (
    <div class={error ? 'textarea-field textarea-field--error' : 'textarea-field'}>
        {label && <label class="textarea-field__label" for={id}>{label}</label>}
        <div class="textarea-field__box" style={{ height: `${height}px` }}>
            <textarea
                id={id}
                class="textarea-field__input"
                name={name}
                maxlength={maxLength}
                placeholder={placeholder}
                value={value}
                disabled={disabled}
                aria-label={label ? undefined : ariaLabel}
                aria-invalid={String(Boolean(error))}
                onInput={onInput}
                onChange={onChange}
            />
            <span class="textarea-field__counter">{value.length} / {maxLength}</span>
        </div>
        {error && <p class="textarea-field__error">{error}</p>}
    </div>
);
