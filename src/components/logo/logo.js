import { registerComponent } from '../../core/template.js';
import source from './logo.hbs?raw';
import './logo.css';

export const renderLogo = registerComponent('logo', source);
