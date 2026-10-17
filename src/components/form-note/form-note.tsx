import './form-note.scss';

export interface FormNoteProps {
    text: string;
    linkHref: string;
    linkText: string;
}

export const FormNote = ({ text, linkHref, linkText }: FormNoteProps) => (
    <p class="form-note">
        {text}{' '}
        <a href={linkHref} data-link class="form-note__link">{linkText}</a>
    </p>
);
