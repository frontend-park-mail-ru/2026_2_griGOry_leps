import { DESCRIPTION_MAX } from '@/lib/listing-form';
import './description-field.scss';

export interface DescriptionFieldProps {
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

export const DescriptionField = ({ value, error = '', onChange }: DescriptionFieldProps) => (
    <div class={error ? 'form-field form-field--error' : 'form-field'}>
        <div class="form-field__control description-field">
            <textarea
                id="listing-description"
                name="description"
                class="form-field__input"
                rows="4"
                aria-label="Описание"
                placeholder="Расскажите о товаре: состояние, комплектация, причина продажи"
                value={value}
                aria-invalid={String(Boolean(error))}
                onInput={(e: Event) => onChange((e.target as HTMLTextAreaElement).value)}
            />
            <span class="description-field__counter">{value.length} / {DESCRIPTION_MAX}</span>
        </div>
        <p class="form-field__error" data-error-for="description">{error || null}</p>
    </div>
);
