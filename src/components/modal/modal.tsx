import { Component, type Child } from '@/vdom';
import './modal.scss';

export interface ModalProps {
    title: string;
    onClose: () => void;
    /** Пока идёт запрос, окно нельзя закрыть */
    locked?: boolean;
    children?: Child;
    footer?: Child;
}

/** Окно поверх страницы: закрывается крестиком, Esc и кликом по фону */
export class Modal extends Component<ModalProps> {
    dialog: HTMLElement | null = null;
    previousFocus: Element | null = null;

    componentDidMount() {
        this.previousFocus = document.activeElement;
        document.addEventListener('keydown', this.handleKeydown);
        document.body.classList.add('modal-open');
        this.dialog?.focus();
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
        document.body.classList.remove('modal-open');
        if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    }

    close = () => {
        if (!this.props.locked) this.props.onClose();
    };

    handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.close();
    };

    handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) this.close();
    };

    render() {
        const { title, children, footer, locked = false } = this.props;

        return (
            <div class="modal" onClick={this.handleBackdropClick}>
                <div
                    class="modal__dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    tabindex="-1"
                    ref={(el) => { this.dialog = el; }}
                >
                    <div class="modal__header">
                        <h2 class="modal__title" id="modal-title">{title}</h2>
                        <button
                            type="button"
                            class="modal__close"
                            aria-label="Закрыть"
                            disabled={locked}
                            onClick={this.close}
                        >×</button>
                    </div>
                    <div class="modal__body">{children}</div>
                    {footer && <div class="modal__footer">{footer}</div>}
                </div>
            </div>
        );
    }
}
