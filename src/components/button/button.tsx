import './button.scss';

export interface ButtonProps {
    text: string;
    type?: 'button' | 'submit';
    block?: boolean;
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
}

export const Button = ({ text, type = 'button', block = false, disabled = false, onClick }: ButtonProps) => (
    <button
        class={block ? 'button button--block' : 'button'}
        type={type}
        disabled={disabled}
        onClick={onClick}
    >{text}</button>
);
