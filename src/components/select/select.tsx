import { Component } from '@/vdom';
import './select.scss';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    id: string;
    options: SelectOption[];
    value: string;
    placeholder?: string;
    invalid?: boolean;
    inline?: boolean;
    label?: string;
    onChange: (value: string) => void;
}

export interface SelectState {
    open: boolean;
    active: number;
}

const CheckIcon = () => (
    <svg class="select__check" viewBox="0 0 16 16" width="16" height="16" fill="none"
        stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
);

export class Select extends Component<SelectProps, SelectState> {
    state: SelectState = { open: false, active: -1 };

    root: HTMLElement | null = null;

    componentDidMount() {
        document.addEventListener('click', this.handleDocumentClick);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick = (e: MouseEvent) => {
        if (this.state.open && !this.root?.contains(e.target as Node)) this.close();
    };

    selectedIndex(): number {
        return this.props.options.findIndex(({ value }) => value === this.props.value);
    }

    open() {
        this.setState({ open: true, active: Math.max(this.selectedIndex(), 0) });
    }

    close() {
        this.setState({ open: false, active: -1 });
    }

    choose(index: number) {
        const option = this.props.options[index];
        this.close();
        if (option && option.value !== this.props.value) this.props.onChange(option.value);
    }

    toggle = () => {
        if (this.state.open) this.close();
        else this.open();
    };

    moveActive(step: number) {
        const { length } = this.props.options;
        if (!length) return;
        this.setState(({ active }) => ({ active: (active + step + length) % length }));
    }

    handleKeyDown = (e: KeyboardEvent) => {
        const { open, active } = this.state;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                if (open) this.moveActive(e.key === 'ArrowDown' ? 1 : -1);
                else this.open();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (open && active >= 0) this.choose(active);
                else this.open();
                break;
            case 'Escape':
                if (open) {
                    e.preventDefault();
                    this.close();
                }
                break;
            case 'Tab':
                if (open) this.close();
                break;
            default:
                break;
        }
    };

    render() {
        const { id, options, value, placeholder = '', invalid = false, inline = false, label } = this.props;
        const { open, active } = this.state;
        const selected = options.find((option) => option.value === value);

        const classes = ['select'];
        if (open) classes.push('select--open');
        if (invalid) classes.push('select--invalid');
        if (inline) classes.push('select--inline');

        return (
            <div class={classes.join(' ')} ref={(el) => { this.root = el as HTMLElement | null; }}>
                <button
                    type="button"
                    id={id}
                    class="select__control"
                    aria-haspopup="listbox"
                    aria-expanded={String(open)}
                    aria-controls={`${id}-list`}
                    aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
                    aria-invalid={String(invalid)}
                    aria-label={label}
                    onClick={this.toggle}
                    onKeyDown={this.handleKeyDown}
                >
                    <span class={selected ? 'select__value' : 'select__value select__value--placeholder'}>
                        {selected ? selected.label : placeholder}
                    </span>
                    <img src="/img/chevron-down.svg" alt="" class="select__chevron" aria-hidden="true" />
                </button>

                {open && (
                    <ul class="select__list" id={`${id}-list`} role="listbox">
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const optionClasses = ['select__option'];
                            if (index === active) optionClasses.push('select__option--active');
                            if (isSelected) optionClasses.push('select__option--selected');

                            return (
                                <li
                                    key={option.value}
                                    id={`${id}-option-${index}`}
                                    class={optionClasses.join(' ')}
                                    role="option"
                                    aria-selected={String(isSelected)}
                                    onMouseEnter={() => this.setState({ active: index })}
                                    onClick={() => this.choose(index)}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <CheckIcon />}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    }
}
