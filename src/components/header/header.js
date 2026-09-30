import template from './header.hbs';
import './header.scss';

export const Header = (props = {}) => {
    return template({
        isAuthenticated: props.isAuthenticated ?? false,
        userName: props.userName ?? '',
        userInitial: props.userInitial ?? '',
    });
};
