import './choice-card.scss';

export interface ChoiceCardProps {
    name: string;
    value: string;
    title: string;
    hint?: string;
    aside?: string;
    checked: boolean;
    disabled?: boolean;
    onSelect: (value: string) => void;
}

export const ChoiceCard = ({ name, value, title, hint, aside, checked, disabled = false, onSelect }: ChoiceCardProps) => {
    const classes = ['choice-card'];
    if (checked) classes.push('choice-card--checked');
    if (disabled) classes.push('choice-card--disabled');

    return (
        <label class={classes.join(' ')}>
            <input
                class="choice-card__radio"
                type="radio"
                name={name}
                value={value}
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(value)}
            />
            <span class="choice-card__text">
                <span class="choice-card__title">{title}</span>
                {hint && <span class="choice-card__hint">{hint}</span>}
            </span>
            {aside && <span class="choice-card__aside">{aside}</span>}
        </label>
    );
};
