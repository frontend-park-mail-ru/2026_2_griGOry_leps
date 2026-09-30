import { registerComponent } from '../../core/template.js';
import source from './auth-card.hbs?raw';
import './auth-card.css';

export const renderAuthCard = registerComponent('auth-card', source);
