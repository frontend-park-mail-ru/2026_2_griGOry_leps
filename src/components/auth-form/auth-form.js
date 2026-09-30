import { registerComponent } from '../../core/template.js';
import '../form-field/form-field.js';
import '../button/button.js';
import '../link/link.js';
import '../form-note/form-note.js';
import source from './auth-form.hbs?raw';
import './auth-form.css';

export const renderAuthForm = registerComponent('auth-form', source);
