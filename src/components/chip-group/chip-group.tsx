import './chip-group.scss';

export interface ChipOption {
    value: string;
    label: string;
}

export interface ChipGroupProps {
    name: string;
    label: string;
    options: ChipOption[];
    value: string;
    invalid?: boolean;
    onChange: (value: string) => void;
}

export const ChipGroup = ({ name, label, options, value, invalid = false, onChange }: ChipGroupProps) => (
    <div class={invalid ? 'chip-group chip-group--invalid' : 'chip-group'} role="radiogroup" aria-label={label} aria-invalid={String(invalid)}>
        {options.map((option) => (
            <button
                key={option.value}
                type="button"
                class={option.value === value ? 'chip-group__chip chip-group__chip--active' : 'chip-group__chip'}
                role="radio"
                name={name}
                aria-checked={String(option.value === value)}
                onClick={() => onChange(option.value)}
            >{option.label}</button>
        ))}
    </div>
);
