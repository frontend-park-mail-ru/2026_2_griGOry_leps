import type { Condition } from '@/lib/api';
import { CONDITION_LABELS } from '@/lib/listing';
import './condition-field.scss';

const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[];

export interface ConditionFieldProps {
    value: Condition | '';
    error?: string;
    onChange: (value: Condition) => void;
}

export const ConditionField = ({ value, error = '', onChange }: ConditionFieldProps) => (
    <fieldset class={error ? 'condition-field condition-field--error' : 'condition-field'}>
        <legend class="form-field__label condition-field__legend">Состояние</legend>
        <div class="condition-field__options">
            {CONDITIONS.map((condition) => (
                <label key={condition} class="condition-field__option">
                    <input
                        class="condition-field__input"
                        type="radio"
                        name="condition"
                        value={condition}
                        checked={value === condition}
                        aria-invalid={String(Boolean(error))}
                        onChange={() => onChange(condition)}
                    />
                    {CONDITION_LABELS[condition]}
                </label>
            ))}
        </div>
        <p class="form-field__error" data-error-for="condition">{error || null}</p>
    </fieldset>
);
