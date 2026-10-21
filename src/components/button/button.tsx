import './button.scss';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

export interface ButtonProps {
    text: string;
    type?: 'button' | 'submit';
    variant?: ButtonVariant;
    block?: boolean;
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
}

export const Button = ({ text, type = 'button', variant = 'primary', block = false, disabled = false, onClick }: ButtonProps) => {
    const classes = ['button'];
    if (variant !== 'primary') classes.push(`button--${variant}`);
    if (block) classes.push('button--block');

    return (
        <button class={classes.join(' ')} type={type} disabled={disabled} onClick={onClick}>{text}</button>
    );
};
