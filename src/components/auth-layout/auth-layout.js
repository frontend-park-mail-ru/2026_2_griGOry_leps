import { registerComponent } from '../../core/template.js';
import '../header/header.js';
import source from './auth-layout.hbs?raw';
import './auth-layout.css';

export const renderAuthLayout = registerComponent('auth-layout', source);
