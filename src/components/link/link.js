import { registerComponent } from '../../core/template.js';
import source from './link.hbs?raw';
import './link.css';

export const renderLink = registerComponent('link', source);
