import { Component, type Child } from '@/vdom';
import './modal.scss';

export interface ModalProps {
    title: string;
    description?: string;
    actions: Child;
    onClose: () => void;
    children?: Child;
}

export class Modal extends Component<ModalProps> {
    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.body.classList.add('body--modal-open');
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.body.classList.remove('body--modal-open');
    }

    handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.props.onClose();
    };

    handleOverlayClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) this.props.onClose();
    };

    render() {
        const { title, description, actions, onClose, children } = this.props;

        return (
            <div class="modal" onClick={this.handleOverlayClick}>
                <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div class="modal__head">
                        <h2 class="modal__title" id="modal-title">{title}</h2>
                        <button type="button" class="modal__close" aria-label="Закрыть" onClick={onClose}>
                            <svg class="modal__close-icon" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M5 5l10 10M15 5L5 15" />
                            </svg>
                        </button>
                    </div>
                    {description && <p class="modal__description">{description}</p>}
                    {children}
                    <div class="modal__actions">{actions}</div>
                </div>
            </div>
        );
    }
}
