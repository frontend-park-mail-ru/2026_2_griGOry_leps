import './button.scss';

/**
 * @param {Object} props
 * @param {string} props.text
 * @param {('button'|'submit')} [props.type]
 * @param {boolean} [props.block] Растянуть на всю ширину
 * @param {boolean} [props.disabled]
 * @param {function(MouseEvent): void} [props.onClick]
 */
export const Button = ({ text, type = 'button', block = false, disabled = false, onClick }) => (
    <button
        class={block ? 'button button--block' : 'button'}
        type={type}
        disabled={disabled}
        onClick={onClick}
    >{text}</button>
);
