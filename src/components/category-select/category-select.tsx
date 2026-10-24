import type { CategoryNode } from '@/lib/api';
import { categoryGroups } from '@/lib/listing-form';
import './category-select.scss';

export interface CategorySelectProps {
    categories: CategoryNode[];
    /** id листа строкой, '' — не выбрана */
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

export const CategorySelect = ({ categories, value, error = '', onChange }: CategorySelectProps) => (
    <div class={error ? 'form-field form-field--error' : 'form-field'}>
        <div class="form-field__control category-select">
            <select
                id="listing-category"
                name="category_id"
                class={value ? 'form-field__input' : 'form-field__input category-select__empty'}
                value={value}
                aria-label="Категория"
                aria-invalid={String(Boolean(error))}
                onChange={(e: Event) => onChange((e.target as HTMLSelectElement).value)}
            >
                <option value="" disabled>Выберите категорию</option>
                {categoryGroups(categories).map((group) => (
                    <optgroup key={group.name} label={group.name}>
                        {group.options.map((opt) => (
                            <option key={opt.id} value={String(opt.id)}>{opt.label}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
        <p class="form-field__error" data-error-for="category_id">{error || null}</p>
    </div>
);
