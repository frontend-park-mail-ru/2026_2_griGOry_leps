import './textarea-field.scss';

export interface TextareaFieldProps {
    id: string;
    name: string;
    label: string;
    value: string;
    maxLength: number;
    height: number;
    placeholder?: string;
    error?: string;
    onInput?: (event: Event) => void;
    onChange?: (event: Event) => void;
}

export const TextareaField = ({
    id, name, label, value, maxLength, height, placeholder, error = '', onInput, onChange,
}: TextareaFieldProps) => (
    <div class={error ? 'textarea-field textarea-field--error' : 'textarea-field'}>
        <label class="textarea-field__label" for={id}>{label}</label>
        <div class="textarea-field__box" style={{ height: `${height}px` }}>
            <textarea
                id={id}
                class="textarea-field__input"
                name={name}
                maxlength={maxLength}
                placeholder={placeholder}
                value={value}
                aria-invalid={String(Boolean(error))}
                onInput={onInput}
                onChange={onChange}
            />
            <span class="textarea-field__counter">{value.length} / {maxLength}</span>
        </div>
        {error && <p class="textarea-field__error">{error}</p>}
    </div>
);
