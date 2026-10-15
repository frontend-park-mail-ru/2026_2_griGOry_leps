import './form-note.scss';

/**
 * Подпись под формой со ссылкой.
 * @param {{text: string, linkHref: string, linkText: string}} props
 */
export const FormNote = ({ text, linkHref, linkText }) => (
    <p class="form-note">
        {text}{' '}
        <a href={linkHref} data-link class="form-note__link">{linkText}</a>
    </p>
);
