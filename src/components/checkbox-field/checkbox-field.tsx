import './checkbox-field.scss';

export interface CheckboxFieldProps {
    name: string;
    label: string;
    hint?: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

export const CheckboxField = ({ name, label, hint, value, onChange }: CheckboxFieldProps) => (
    <label class="checkbox-field">
        <input
            class="checkbox-field__input"
            type="checkbox"
            name={name}
            checked={value}
            onChange={(e: Event) => onChange((e.target as HTMLInputElement).checked)}
        />
        <span class="checkbox-field__text">
            {label}
            {hint && <span class="checkbox-field__hint">{hint}</span>}
        </span>
    </label>
);
