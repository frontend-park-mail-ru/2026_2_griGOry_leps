import template from './footer.hbs';
import './footer.scss';

export const Footer = () => {
    return template({ year: new Date().getFullYear() });
};