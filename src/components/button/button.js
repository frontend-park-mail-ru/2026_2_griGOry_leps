import { registerComponent } from '../../core/template.js';
import source from './button.hbs?raw';
import './button.css';

export const renderButton = registerComponent('button', source);
